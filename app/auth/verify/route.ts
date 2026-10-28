import { NextResponse, type NextRequest } from "next/server";
import { setSessionCookie, verifyMagicToken } from "@/lib/auth";
import { db } from "@/lib/db";
import { sendWelcome } from "@/lib/scheduler";

const base = () => process.env.APP_BASE_URL ?? "http://localhost:3000";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = verifyMagicToken(token);

  if (result && result !== "expired" && result !== "not_found") {
    await setSessionCookie(result.id);
    // brand-new accounts get a one-time welcome tour by email
    if (result.created_at > Date.now() - 5_000) void sendWelcome(result).catch(console.error);
    return NextResponse.redirect(`${base()}/dashboard`);
  }
  return NextResponse.redirect(`${base()}/?err=${result === "expired" ? "expired" : "not_found"}`);
}
