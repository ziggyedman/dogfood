"use server";

import { createMagicLink } from "@/lib/auth";
import { sendEmail } from "@/lib/mailer";
import { MagicLinkEmail } from "@/lib/templates";

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export async function requestMagicLink(_prev: string | { error: string } | null, formData: FormData): Promise<string | { error: string }> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };

  const { url } = createMagicLink(email);
  const sent = await sendEmail({
    to: email,
    subject: "Your sign-in link for Nudge",
    kind: "magic",
    react: <MagicLinkEmail url={url} />,
  });
  if (!sent.ok) return { error: "The sign-in email failed to send — check RESEND_API_KEY setup." };
  return `Sent! Check ${email} — click the link to sign in. (Expiring magic links, delivered by Resend.)`;
}
