import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const g = globalThis as typeof globalThis & { __nudgeDb?: DatabaseSync };

export const db: DatabaseSync = g.__nudgeDb ?? (g.__nudgeDb = new DatabaseSync(path.join(dataDir, "nudge.db")));

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  digest INTEGER NOT NULL DEFAULT 1,
  digest_day INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS magic_tokens (
  token TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  due_at INTEGER NOT NULL,
  repeat TEXT NOT NULL DEFAULT 'none',
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at INTEGER NOT NULL,
  last_sent INTEGER
);
CREATE INDEX IF NOT EXISTS idx_reminders_due ON reminders(status, due_at);
CREATE TABLE IF NOT EXISTS inbound_seen (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS email_log (
  id TEXT PRIMARY KEY,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  kind TEXT NOT NULL,
  resend_id TEXT,
  status TEXT NOT NULL,
  error TEXT,
  created_at INTEGER NOT NULL
);
`);

export type UserRow = {
  id: string;
  email: string;
  digest: number;
  digest_day: number;
  created_at: number;
};

export type ReminderRow = {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  due_at: number;
  repeat: string;
  status: string;
  created_at: number;
  last_sent: number | null;
};

export type EmailLogRow = {
  id: string;
  to_email: string;
  subject: string;
  kind: string;
  resend_id: string | null;
  status: string;
  error: string | null;
  created_at: number;
};

export function uid(): string {
  return crypto.randomUUID();
}

export function now(): number {
  return Date.now();
}
