import "server-only";

import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { db, now, uid, type UserRow } from "./db";

const COOKIE = "nudge_session";
const SESSION_TTL_DAYS = 30;
const MAGIC_TTL_MS = 30 * 60 * 1000;

function sign(value: string): string {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET ?? "dev-secret").update(value).digest("base64url");
}

function makeSigned(payload: string): string {
  const p = Buffer.from(payload).toString("base64url");
  return `${p}.${sign(p)}`;
}

function readSigned(token: string): string | null {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const expected = sign(p);
  if (sig.length !== expected.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return Buffer.from(p, "base64url").toString();
}

/** Currently signed-in user, or null. */
export async function getSessionUser(): Promise<UserRow | null> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw) return null;
  const payload = readSigned(raw);
  if (!payload) return null;
  try {
    const { uid: userId } = JSON.parse(payload) as { uid: string };
    const row = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as UserRow | undefined;
    return row ?? null;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<UserRow> {
  const user = await getSessionUser();
  if (!user) nextRedirect("/");
  return user!;
}

/** Create a one-time magic link for an email (used for signup AND login). */
export function createMagicLink(email: string): { url: string; token: string } {
  const token = crypto.randomBytes(24).toString("hex");
  db.prepare("INSERT INTO magic_tokens (token, email, expires_at) VALUES (?, ?, ?)").run(
    token,
    email,
    now() + MAGIC_TTL_MS
  );
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return { url: `${base}/auth/verify?token=${token}`, token };
}

/** Consume a magic token: single use, TTL enforced. Returns the user (creates one if needed). */
export function verifyMagicToken(token: string): UserRow | "expired" | "not_found" | null {
  const row = db.prepare("SELECT * FROM magic_tokens WHERE token = ?").get(token) as
    | { token: string; email: string; expires_at: number }
    | undefined;
  if (!row) return "not_found";
  db.prepare("DELETE FROM magic_tokens WHERE token = ?").run(token);
  if (row.expires_at < now()) return "expired";

  const email = row.email.trim().toLowerCase();
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!user) {
    db.prepare("INSERT INTO users (id, email, digest, digest_day, created_at) VALUES (?, ?, 1, 1, ?)").run(
      uid(),
      email,
      now()
    );
    user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow;
  }
  return user;
}

export async function setSessionCookie(userId: string): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE, makeSigned(JSON.stringify({ uid: userId })), {
    httpOnly: true,
    sameSite: "lax",
    secure: (process.env.APP_BASE_URL ?? "").startsWith("https"),
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60,
    path: "/",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE);
}
