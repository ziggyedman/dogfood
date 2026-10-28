"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { db, now, uid, type UserRow } from "@/lib/db";
import { sendWeeklyDigest } from "@/lib/scheduler";

async function user(): Promise<UserRow> {
  return requireUser();
}

export async function createReminder(formData: FormData): Promise<void> {
  const u = await user();
  const title = String(formData.get("title") ?? "").trim().slice(0, 140);
  if (!title) return;
  const dueStr = String(formData.get("due") ?? "");
  const due = dueStr ? new Date(dueStr).getTime() : tomorrow9am();
  const repeat = String(formData.get("repeat") ?? "none");

  db.prepare("INSERT INTO reminders (id, user_id, title, notes, due_at, repeat, status, created_at) VALUES (?, ?, ?, '', ?, ?, 'scheduled', ?)").run(
    uid(), u.id, title, due, repeat, now()
  );
  revalidatePath("/dashboard");
}

export async function completeReminder(formData: FormData): Promise<void> {
  const u = await user();
  db.prepare("UPDATE reminders SET status = 'done', last_sent = ? WHERE id = ? AND user_id = ?").run(now(), fid(formData), u.id);
  revalidatePath("/dashboard");
}

export async function cancelReminder(formData: FormData): Promise<void> {
  const u = await user();
  db.prepare("UPDATE reminders SET status = 'canceled' WHERE id = ? AND user_id = ?").run(fid(formData), u.id);
  revalidatePath("/dashboard");
}

export async function snoozeReminder(formData: FormData): Promise<void> {
  const u = await user();
  const minutes = parseInt(String(formData.get("minutes") ?? "60"), 10);
  db.prepare("UPDATE reminders SET due_at = ? WHERE id = ? AND user_id = ? AND status = 'scheduled'").run(now() + minutes * 60_000, fid(formData), u.id);
  revalidatePath("/dashboard");
}

export async function toggleDigest(formData: FormData): Promise<void> {
  const u = await user();
  const on = String(formData.get("to")) === "on";
  db.prepare("UPDATE users SET digest = ? WHERE id = ?").run(on ? 1 : 0, u.id);
  revalidatePath("/dashboard");
}

export async function sendDigest(): Promise<void> {
  const u = await user();
  await sendWeeklyDigest(u);
  revalidatePath("/dashboard");
}

function fid(formData: FormData): string {
  return String(formData.get("id") ?? "");
}

function tomorrow9am(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d.getTime();
}
