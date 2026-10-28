import type { Metadata } from "next";
import "./globals.css";
import { ensureScheduler } from "@/lib/scheduler";
import { getSessionUser } from "@/lib/auth";
import { INBOUND_HINT } from "@/lib/config";

export const metadata: Metadata = {
  title: "Nudge — reminders by email",
  description: "Email-first reminders, powered by Resend. Sign up with a magic link, mail optional.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  ensureScheduler(); // start the inbound/reminder worker with the server
  const user = await getSessionUser();
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="wrap header-row">
            <a href="/" className="logo">Nudge</a>
            <nav>
              {user ? (
                <a href="/dashboard" className="nav-link">Dashboard</a>
              ) : (
                <span className="nav-note">Reminders by email, powered by <a href="https://resend.com" target="_blank" rel="noreferrer">Resend</a></span>
              )}
            </nav>
          </div>
        </header>
        <main className="wrap">{children}</main>
        <footer className="site-footer wrap">
          Dogfooding Resend end-to-end · transactional magic links, inbound <code>{INBOUND_HINT}</code>, weekly digests
        </footer>
      </body>
    </html>
  );
}
