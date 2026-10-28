import type { ReminderRow, UserRow } from "@/lib/db";
import { fmtDate } from "@/lib/dateparse";
import { db, now } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { recentEmailLog } from "@/lib/mailer";
import { completeReminder, cancelReminder, snoozeReminder, createReminder, toggleDigest, sendDigest } from "./actions";
import Refresher from "./refresher";

export const dynamic = "force-dynamic";

type ReminderWithFlags = ReminderRow & { overdue: boolean };

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ done?: string }> }) {
  const user = (await requireUser()) as UserRow;
  // "Mark as done" links inside reminder emails land here: /dashboard?done=ID
  const { done } = await searchParams;
  if (done) completeReminderQuiet(user.id, done);

  const t = now();
  const rows = db.prepare("SELECT * FROM reminders WHERE user_id = ? ORDER BY due_at ASC").all(user.id) as ReminderRow[];
  const reminders: ReminderWithFlags[] = rows.map((r) => ({ ...r, overdue: r.due_at < t && r.status === "scheduled" }));
  const scheduled = reminders.filter((r) => r.status === "scheduled");
  const inbox = process.env.INBOUND_ADDRESS ?? "todo@baard.cc";
  const log = recentEmailLog(user.email, 15);

  return (
    <>
      <Refresher />
      <div className="dash-head">
        <h1>Dashboard</h1>
        <div className="who">Signed in as {user.email}</div>
      </div>

      <div className="you-card">
        <div className="tip">
          Email anything to <code>{inbox}</code> — the subject is the reminder, dates like <em>“tomorrow”</em>, <em>“friday”</em>, <em>“in 2 hours”</em> are parsed automatically.
        </div>
      </div>

      <div className="columns">
        <div>
          <div className="panel">
            <h2>Add a reminder</h2>
            <form action={createReminder} className="reminder-form">
              <input type="hidden" name="uid" value={user.id} />
              <div className="field-row">
                <input type="text" name="title" placeholder="What do you need to remember?" required />
                <select name="repeat" defaultValue="none">
                  <option value="none">once</option>
                  <option value="daily">daily</option>
                  <option value="weekly">weekly</option>
                  <option value="monthly">monthly</option>
                </select>
              </div>
              <div className="field-row">
                <input type="datetime-local" name="due" />
                <button type="submit">Add reminder</button>
              </div>
            </form>
          </div>

          <div className="panel">
            <h2>Reminders ({scheduled.length} scheduled)</h2>
            {reminders.length === 0 ? (
              <div className="empty">Nothing yet. Add one above, or email <b>{inbox}</b> your first reminder.</div>
            ) : (
              <ul className="reminder-list">
                {reminders.map((r) => (
                  <li key={r.id}>
                    <div>
                      <div className={`reminder-title ${r.status !== "scheduled" ? "muted" : ""}`}>{r.title}</div>
                      <div className={`due ${r.overdue ? "overdue" : ""}`}>
                        {capitalize(r.status)} · {fmtDate(r.due_at)}
                        {r.repeat !== "none" ? ` · repeats ${r.repeat}` : ""}
                      </div>
                      {r.notes ? <div className="reminder-notes">{r.notes}</div> : null}
                    </div>
                    {r.status === "scheduled" ? (
                      <div className="actions">
                        <form action={completeReminder}> <input type="hidden" name="id" value={r.id} /> <button className="small">Done</button> </form>
                        <form action={snoozeReminder}> <input type="hidden" name="id" value={r.id} /> <input type="hidden" name="minutes" value="60" /> <button className="ghost small">+1h</button> </form>
                        <form action={cancelReminder}> <input type="hidden" name="id" value={r.id} /> <button className="ghost small danger">Cancel</button> </form>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <div className="panel">
            <h2>Weekly digest</h2>
            <div className="digest-row">
              <div className="stat">{user.digest ? "On — Monday mornings at 8am" : "Off"}</div>
              <div className="actions">
                <form action={sendDigest}><button className="ghost small">Send now</button></form>
                <form action={toggleDigest}><input type="hidden" name="to" value={user.digest ? "off" : "on"} /><button className="ghost small">{user.digest ? "Turn off" : "Turn on"}</button></form>
              </div>
            </div>
          </div>

          <div className="panel">
            <h2>Email log <span style={{ color: "var(--muted)", fontWeight: 400 }}>— every send through Resend</span></h2>
            {log.length === 0 ? (
              <div className="empty">No emails sent yet.</div>
            ) : (
              <ul className="log-list">
                {log.map((e) => (
                  <li key={e.id}>
                    <span className="log-kind">{e.kind}</span>
                    <span className="log-subject" title={e.subject}>{e.subject}</span>
                    <span className={`log-status ${e.status === "sent" ? "ok" : "fail"}`}>{e.status}</span>
                    <span className="log-time">{new Date(e.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function completeReminderQuiet(userId: string, id: string): void {
  db.prepare("UPDATE reminders SET status = 'done', last_sent = ? WHERE id = ? AND user_id = ?").run(now(), id, userId);
}
