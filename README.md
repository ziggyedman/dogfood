# Nudge ✉️

**Reminders by email, powered entirely by Resend.** A dogfood app that exercises nearly every Resend surface:

| Resend surface | How Nudge uses it |
|---|---|
| **Transactional send** | Passwordless magic-link signup + login (single-use links, 30-min expiry) |
| **Scheduled / due notifications** | When a reminder is due, a nudge email arrives with a "Mark as done" action link |
| **Inbound email (receiving)** | Email `todo@baard.cc` anything like *"book dentist friday"* → it becomes a reminder (subject = title, dates parsed from the body) |
| **Broadcast-style digest** | Weekly Monday-morning digest: what you created, finished, got nudged about |
| **Open/click tracking** | Enabled on `baard.cc` — the digest newsletter benefits directly |
| **Observability** | Every send is logged in the app's Email Log panel (kind, subject, status) |

## Stack

- **Next.js 16** (App Router, Server Actions) + React 19
- **`node:sqlite`** — zero-dependency local storage at `data/nudge.db`
- **Resend Node SDK** (`resend`) for sending
- **Resend REST** for the inbound polling worker (`/emails/receiving`)
- **React Email** (`@react-email/components`) for the four templates
- Background worker: in-process scheduler (60s tick) + idempotent `GET /api/cron?secret=…` for external crons

## Run it

```bash
npm install
npm run dev        # http://localhost:3002
```

Environment lives in `.env.local`:

```
RESEND_API_KEY=…       # created via `resend api-keys create`
RESEND_FROM=nudge@baard.cc
INBOUND_ADDRESS=todo@baard.cc
APP_BASE_URL=http://localhost:3002
SESSION_SECRET=…       # HMAC secret for session cookies
CRON_SECRET=…          # protects /api/cron
DIGEST_HOUR=8          # local hour digests go out
```

## The flows

1. **Sign up** — enter your email on `/`. A magic link arrives; clicking it creates your account and sends a one-time welcome tour.
2. **Mail it in** — send any email to `todo@baard.cc`. Within a minute the inbound worker creates a reminder for your account ("tomorrow", "friday", "in 2 hours" parsed from subject + body).
3. **Get nudged** — when something is due, you get a notification email. The dashboard also shows every send in the Email Log.
4. **Weekly digest** — Monday 8am (or the "Send now" button) triggers a broadcast-style newsletter with your week's stats.

## Deploy note

The local scheduler self-runs, but on serverless platforms point a cron service at:

```
GET /api/cron?secret=$CRON_SECRET
```

Keep `data/` on a persistent volume or swap `lib/db.ts` for a hosted DB.
