import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { requestMagicLink } from "./actions";
import SignupForm from "./signup-form";

export default async function Landing({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  const { err } = await searchParams;

  return (
    <>
      {err === "expired" || err === "not_found" ? (
        <div style={{ paddingTop: 24 }}>
          <div className="banner">That sign-in link is no longer valid — request a new one below.</div>
        </div>
      ) : null}

      <section className="hero">
        <h1>
          Remember anything,<br />
          <em>right in your inbox.</em>
        </h1>
        <p className="sub">
          Nudge turns email into your todo list — sign in with a link, add reminders in the app or by email, and get a nudge the moment something is due.
        </p>
        <div className="signup-card">
          <SignupForm action={requestMagicLink} />
          <p className="notice">
            No password. You'll get a one-click sign-in link — the same way you'd verify any account. That first email is coming from Resend.
          </p>
        </div>
      </section>

      <section className="features">
        <div className="feature">
          <div className="tag">TRANSACTIONAL</div>
          <h3>Magic-link sign-in</h3>
          <p>
            Passwordless signup and login via one-time verification emails. Every session starts with a real transactional send.
          </p>
        </div>
        <div className="feature">
          <div className="tag">NOTIFICATIONS</div>
          <h3>Nudges when due</h3>
          <p>
            Add reminders with dates like <code>next friday</code> or <code>in 2 hours</code>. When something is due, you get an email you can act on.
          </p>
        </div>
        <div className="feature">
          <div className="tag">INBOUND + BROADCASTS</div>
          <h3>Mail it in, digest it out</h3>
          <p>
            Email <code>todo@baard.cc</code> anything like "book dentist Friday" and it's added automatically. Every Monday, a weekly digest lands in your inbox.
          </p>
        </div>
      </section>
    </>
  );
}
