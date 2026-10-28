import "server-only";

import type { ReactElement } from "react";
import { Resend } from "resend";
import { db, now, uid, type EmailLogRow } from "./db";

let _resend: Resend | null = null;
export function resend(): Resend {
  if (!_resend) {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error("RESEND_API_KEY is not set");
    _resend = new Resend(key);
  }
  return _resend;
}

export type EmailKind = "magic" | "welcome" | "reminder" | "digest" | "inbound-bounce";

export async function sendEmail(opts: {
  to: string;
  subject: string;
  react: ReactElement;
  kind: EmailKind;
}): Promise<{ id?: string; ok: boolean }> {
  const from = process.env.RESEND_FROM ?? "Nudge reminders <hey@baard.cc>";
  const id = uid();
  try {
    const { data, error } = await resend().emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      react: opts.react,
    });
    if (error) throw new Error(`${error.name}: ${error.message}`);
    db.prepare(
      "INSERT INTO email_log (id, to_email, subject, kind, resend_id, status, created_at) VALUES (?, ?, ?, ?, ?, 'sent', ?)"
    ).run(id, opts.to, opts.subject, opts.kind, data?.id ?? null, now());
    return { id: data?.id, ok: true };
  } catch (err) {
    db.prepare(
      "INSERT INTO email_log (id, to_email, subject, kind, resend_id, status, error, created_at) VALUES (?, ?, ?, ?, ?, 'failed', ?, ?)"
    ).run(id, opts.to, opts.subject, opts.kind, null, String(err).slice(0, 500), now());
    return { ok: false };
  }
}

export function recentEmailLog(toEmail: string, limit = 15): EmailLogRow[] {
  return db
    .prepare("SELECT * FROM email_log WHERE to_email = ? ORDER BY created_at DESC LIMIT ?")
    .all(toEmail, limit) as EmailLogRow[];
}
