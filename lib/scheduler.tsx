import "server-only";

import { sendEmail } from "./mailer";
import { db, now, uid, type ReminderRow, type UserRow } from "./db";
import { fmtDate, nextOccurrence, parseDueDate } from "./dateparse";
import { DigestEmail, ReminderEmail, WelcomeEmail } from "./templates";

const RESEND_API = "https://api.resend.com";
const g = globalThis as typeof globalThis & { __nudgeScheduler?: ReturnType<typeof setInterval> };

function authHeaders(): HeadersInit {
  return { Authorization: `Bearer ${process.env.RESEND_API_KEY ?? ""}`, "content-type": "application/json" };
}

function baseUrl(): string {
  return process.env.APP_BASE_URL ?? "http://localhost:3000";
}

/** Start the 60s background worker (idempotent; safe to call on every render). */
export function ensureScheduler(): void {
  if (g.__nudgeScheduler) return;
  g.__nudgeScheduler = setInterval(() => {
    void tick().catch((e) => console.error("[nudge scheduler]", e));
  }, 60_000);
  setTimeout(() => {
    void tick().catch((e) => console.error("[nudge scheduler]", e));
  }, 3_000).unref();
}

export type TickResult = {
  nudged: number;
  reshapedRepeat: number;
  inboundNew: number;
  inboundCreated: number;
  digests: number;
};

/** One scheduler pass: due reminders → notification emails, inbound ingest, weekly digests. */
export async function tick(): Promise<TickResult> {
  const result = { nudged: 0, reshapedRepeat: 0, inboundNew: 0, inboundCreated: 0, digests: 0 };
  await processDue(result);
  await ingestInbound(result);
  await sendDigests(result);
  return result;
}

async function processDue(result: TickResult): Promise<void> {
  const due = db
    .prepare(
      `SELECT r.*, u.email FROM reminders r JOIN users u ON u.id = r.user_id
       WHERE r.status = 'scheduled' AND r.due_at <= ?`
    )
    .all(now()) as (ReminderRow & { email: string })[];

  for (const r of due) {
    const sent = await sendEmail({
      to: r.email,
      subject: `⏰ ${r.title}`,
      kind: "reminder",
      react: <ReminderEmail title={r.title} notes={r.notes} dueLabel={fmtDate(r.due_at)} dashboardUrl={`${baseUrl()}/dashboard?done=${r.id}`} />,
    });
    if (sent.ok) result.nudged++;

    const next = nextOccurrence(r.due_at, r.repeat);
    if (next) {
      db.prepare("UPDATE reminders SET due_at = ?, last_sent = ? WHERE id = ?").run(next, now(), r.id);
      result.reshapedRepeat++;
    } else {
      db.prepare("UPDATE reminders SET status = 'sent', last_sent = ? WHERE id = ?").run(now(), r.id);
    }
  }
}

type InboundSummary = { id: string; to: string[]; from: string; subject?: string };

async function ingestInbound(result: TickResult): Promise<void> {
  const inbox = process.env.INBOUND_ADDRESS ?? "todo@baard.cc";

  let list: { data?: InboundSummary[] };
  try {
    const res = await fetch(`${RESEND_API}/emails/receiving`, { headers: authHeaders(), cache: "no-store" });
    if (!res.ok) return;
    list = (await res.json()) as { data?: InboundSummary[] };
  } catch {
    return;
  }

  for (const item of list.data ?? []) {
    if (!item.to?.includes(inbox)) continue;
    const seen = db.prepare("SELECT 1 FROM inbound_seen WHERE id = ?").get(item.id);
    if (seen) continue;
    result.inboundNew++;

    // fetch the full body for parsing
    let text = "";
    try {
      const res = await fetch(`${RESEND_API}/emails/receiving/${item.id}`, { headers: authHeaders(), cache: "no-store" });
      if (res.ok) {
        const full = (await res.json()) as { text?: string; html?: string };
        text = full.text ?? String(full.html ?? "").replace(/<[^>]+>/g, " ");
      }
    } catch {
      /* fall back to subject-only parsing */
    }

    db.prepare("INSERT INTO inbound_seen (id, created_at) VALUES (?, ?)").run(item.id, now());
    if (!item.subject && !text) continue;

    const senderEmail = /[\w.+-]+@[\w.-]+/.exec(item.from ?? "")?.[0]?.toLowerCase() ?? null;
    const user = senderEmail
      ? (db.prepare("SELECT * FROM users WHERE email = ?").get(senderEmail) as UserRow | undefined)
      : undefined;
    if (!user) continue; // only known users mail in

    const title = (item.subject ?? "untitled reminder").replace(/^(fwd?:|re:)\s*/i, "").trim().slice(0, 120) || "untitled reminder";
    const due = parseDueDate(`${item.subject ?? ""} ${text}`) ?? parseDueDate("tomorrow");

    db.prepare("INSERT INTO reminders (id, user_id, title, notes, due_at, repeat, status, created_at) VALUES (?, ?, ?, ?, ?, 'none', 'scheduled', ?)").run(
      uid(),
      user.id,
      title,
      text.replace(/\s+/g, " ").trim().slice(0, 600),
      due!.getTime(),
      now()
    );
    result.inboundCreated++;
  }
}

async function sendDigests(result: TickResult): Promise<void> {
  const hour = parseInt(process.env.DIGEST_HOUR ?? "8", 10);
  const d = new Date();
  if (d.getHours() !== hour) return;

  const users = db.prepare("SELECT * FROM users WHERE digest = 1").all() as UserRow[];
  for (const u of users) {
    if (d.getDay() !== u.digest_day) continue;

    const alreadySent = db
      .prepare("SELECT 1 FROM email_log WHERE to_email = ? AND kind = 'digest' AND created_at > ?")
      .get(u.email, now() - 20 * 60 * 60 * 1000);
    if (alreadySent) continue;

    await sendWeeklyDigest(u);
    result.digests++;
  }
}

/** Build + send one user's weekly digest (used by the scheduler and the "send now" button). */
export async function sendWeeklyDigest(u: UserRow): Promise<void> {
  const weekAgo = now() - 7 * 24 * 60 * 60 * 1000;
  const created = (
    db.prepare("SELECT COUNT(*) AS c FROM reminders WHERE user_id = ? AND created_at > ?").get(u.id, weekAgo) as { c: number }
  ).c;
  const completed = (
    db.prepare("SELECT COUNT(*) AS c FROM reminders WHERE user_id = ? AND status = 'done' AND last_sent > ?").get(u.id, weekAgo) as { c: number }
  ).c;
  const nudged = (
    db.prepare("SELECT COUNT(*) AS c FROM email_log WHERE to_email = ? AND kind = 'reminder' AND created_at > ?").get(u.email, weekAgo) as { c: number }
  ).c;
  const upcoming = (
    db
      .prepare("SELECT title, due_at FROM reminders WHERE user_id = ? AND status = 'scheduled' ORDER BY due_at ASC LIMIT 5")
      .all(u.id) as { title: string; due_at: number }[]
  ).map((r) => ({ title: r.title, dueLabel: fmtDate(r.due_at) }));

  await sendEmail({
    to: u.email,
    subject: "Your week with Nudge",
    kind: "digest",
    react: (
      <DigestEmail
        email={u.email}
        inbox={process.env.INBOUND_ADDRESS ?? "todo@baard.cc"}
        stats={{ created, completed, sent: nudged }}
        upcoming={upcoming}
      />
    ),
  });
}

/** After a first successful sign-in, send a short welcome tour. */
export async function sendWelcome(user: UserRow): Promise<void> {
  await sendEmail({
    to: user.email,
    subject: "Welcome to Nudge 👋",
    kind: "welcome",
    react: <WelcomeEmail email={user.email} inbox={process.env.INBOUND_ADDRESS ?? "todo@baard.cc"} />,
  });
}
