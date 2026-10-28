import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

const primary = "#111111";
const muted = "#8a8a8a";
const bg = "#faf9f7";

function Shell({ children, preview }: { children: React.ReactNode; preview: string }) {
  return (
    <Html>
      <Head />
      <Body style={{ background: bg, fontFamily: "Helvetica, Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "24px 16px" }}>
          <Text style={{ fontSize: 13, letterSpacing: 1, color: muted, margin: "0 0 8px" }}>N U D G E</Text>
          <Section style={{ background: "#ffffff", border: "1px solid #e5e2dd", borderRadius: 12, padding: 28 }}>
            {children}
          </Section>
          <Text style={{ fontSize: 11, color: muted, margin: "16px 4px" }}>
            Sent with{" "}
            <Link href="https://resend.com" style={{ color: primary, textDecoration: "underline" }}>
              Resend
            </Link>
            . Reply to your reminders at todo@baard.cc.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export function MagicLinkEmail({ url }: { url: string }) {
  return (
    <Shell preview="Your sign-in link for Nudge">
      <Heading style={{ fontSize: 20, margin: "0 0 12px" }}>Sign in to Nudge</Heading>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#333", margin: "0 0 20px" }}>
        Click below to sign in. The link works once and expires in 30 minutes — no password needed.
      </Text>
      <Button href={url} style={{ background: primary, color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700 }}>
        Sign in to Nudge
      </Button>
      <Hr style={{ borderColor: "#e5e2dd", margin: "24px 0" }} />
      <Text style={{ fontSize: 12, color: muted, wordBreak: "break-all" }}>Or paste this link into your browser: {url}</Text>
    </Shell>
  );
}

export function WelcomeEmail({ email, inbox }: { email: string; inbox: string }) {
  return (
    <Shell preview="Welcome to Nudge — reminders by email">
      <Heading style={{ fontSize: 20, margin: "0 0 12px" }}>Welcome to Nudge 👋</Heading>
      <Text style={{ fontSize: 14, lineHeight: "22px", color: "#333", margin: "0 0 8px" }}>
        Your account <strong>{email}</strong> is live. Three ways to remember things from here on:
      </Text>
      <Section style={{ margin: "12px 0", padding: 14, background: bg, borderRadius: 8 }}>
        <Text style={{ fontSize: 14, margin: 0, lineHeight: "24px" }}>
          <strong>1.</strong> Add reminders in the dashboard → we email you when they're due.<br />
          <strong>2.</strong> Email <strong>{inbox}</strong> with anything like "book dentist Friday" → it becomes a reminder.<br />
          <strong>3.</strong> Once a week you'll get your digest — what you shipped, what's next.
        </Text>
      </Section>
      <Button
        href={`${process.env.APP_BASE_URL ?? "http://localhost:3000"}/dashboard`}
        style={{ background: primary, color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700 }}
      >
        Open your dashboard
      </Button>
    </Shell>
  );
}

export function ReminderEmail({ title, notes, dueLabel, dashboardUrl }: { title: string; notes?: string; dueLabel: string; dashboardUrl: string }) {
  return (
    <Shell preview={`Due now: ${title}`}>
      <Text style={{ fontSize: 12, letterSpacing: 1, color: muted, margin: "0 0 6px" }}>NUDGE — DUE {dueLabel.toUpperCase()}</Text>
      <Heading style={{ fontSize: 22, margin: "0 0 12px" }}>{title}</Heading>
      {notes ? (
        <Section style={{ borderLeft: "3px solid #e5e2dd", padding: "2px 12px", margin: "0 0 18px" }}>
          <Text style={{ fontSize: 14, color: "#333", lineHeight: "22px", margin: 0, whiteSpace: "pre-line" }}>
            {notes.slice(0, 600)}
          </Text>
        </Section>
      ) : null}
      <Button href={dashboardUrl} style={{ background: primary, color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700 }}>
        Mark as done
      </Button>
      <Text style={{ fontSize: 12, color: muted, margin: "14px 0 0" }}>
        Marking done happens in your dashboard — you're already signed in.
      </Text>
    </Shell>
  );
}

export function DigestEmail({ email, inbox, stats, upcoming }: { email: string; inbox: string; stats: { created: number; completed: number; sent: number }; upcoming: { title: string; dueLabel: string }[] }) {
  return (
    <Shell preview="Your week with Nudge — digest">
      <Heading style={{ fontSize: 20, margin: "0 0 4px" }}>Your week with Nudge</Heading>
      <Text style={{ fontSize: 13, color: muted, margin: "0 0 18px" }}>
        For {email} · every Monday morning, delivered by Resend
      </Text>
      <Section style={{ margin: "0 0 18px" }}>
        <table cellPadding={0} cellSpacing={0} style={{ width: "100%", fontSize: 14 }}>
          <tr>
            <td style={{ background: bg, border: "1px solid #e5e2dd", borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.created}</div>
              <div style={{ fontSize: 12, color: muted }}>created</div>
            </td>
            <td style={{ width: 8 }} />
            <td style={{ background: bg, border: "1px solid #e5e2dd", borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.completed}</div>
              <div style={{ fontSize: 12, color: muted }}>done</div>
            </td>
            <td style={{ width: 8 }} />
            <td style={{ background: bg, border: "1px solid #e5e2dd", borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{stats.sent}</div>
              <div style={{ fontSize: 12, color: muted }}>nudged</div>
            </td>
          </tr>
        </table>
      </Section>
      {upcoming.length > 0 ? (
        <>
          <Heading style={{ fontSize: 15, margin: "0 0 8px" }}>Coming up next</Heading>
          <Section style={{ margin: "0 0 16px" }}>
            {upcoming.map((u, i) => (
              <Text key={i} style={{ fontSize: 14, margin: "0 0 6px", lineHeight: "22px" }}>
                • <strong>{u.title}</strong> — {u.dueLabel}
              </Text>
            ))}
          </Section>
        </>
      ) : (
        <Text style={{ fontSize: 14, color: "#333", margin: "0 0 16px" }}>Nothing scheduled yet — email {inbox} to add your first reminder.</Text>
      )}
      <Button
        href={`${process.env.APP_BASE_URL ?? "http://localhost:3000"}/dashboard`}
        style={{ background: primary, color: "#fff", borderRadius: 8, padding: "10px 18px", fontSize: 14, fontWeight: 700 }}
      >
        Open dashboard
      </Button>
    </Shell>
  );
}
