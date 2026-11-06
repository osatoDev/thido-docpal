# Thido

An AI document-creation platform: answer a short questionnaire, let Claude
draft the first version, then edit it in a Google-Docs-like editor. Highlight
any text to ask the AI a question or request a change — it replies inline or
edits the document directly, based on your settings.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma
- Auth.js v5 (Google OAuth and email/password) + `@auth/prisma-adapter`
- Stripe hosted Checkout and Customer Portal through the Vercel Marketplace
- Tiptap (ProseMirror) for the rich text editor, with a custom `CommentMark`
  extension for anchoring comments to text spans
- `@anthropic-ai/sdk` (Claude, model `claude-opus-4-8`) for the prompt
  wizard and inline AI comment responses

## Local development

### 1. Database

Any Postgres instance works. For a fully isolated local instance that won't
touch anything else on your machine:

```bash
PGBIN=/Applications/Postgres.app/Contents/Versions/16/bin   # adjust to your install
"$PGBIN/initdb" -D .localpg -U postgres --auth=trust
"$PGBIN/pg_ctl" -D .localpg -l .localpg/logfile -o "-p 5544 -k .localpg" start
"$PGBIN/createdb" -h .localpg -p 5544 -U postgres thido_docpal
```

(`.localpg/` is gitignored.) Stop it later with:
`"$PGBIN/pg_ctl" -D .localpg stop`.

### 2. Environment variables

Copy `.env.example` to `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` / `DATABASE_URL_UNPOOLED` | Your Postgres connection string (same value for both locally; in production on Neon, `DATABASE_URL` is the pooled string and `DATABASE_URL_UNPOOLED` is the direct one, used for migrations) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://localhost:3000` locally |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) — create an OAuth 2.0 Client ID (Web application), with `http://localhost:3000/api/auth/callback/google` as an authorized redirect URI |
| `RESEND_API_KEY` | Resend API key used for verification and password-reset emails |
| `AUTH_EMAIL_FROM` | Verified Resend sender, for example `Thido <auth@thido.ai>` |
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) |
| `STRIPE_SECRET_KEY` | Provisioned by the Stripe integration in the Vercel Marketplace |
| `STRIPE_PRO_PRICE_ID` | Recurring Stripe Price ID for the paid plan; omit it while paid checkout should remain hidden |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the deployed `/api/webhooks/stripe` endpoint |

Without `ANTHROPIC_API_KEY`, everything works except the AI-dependent steps
(follow-up question generation, document generation, and the AI half of
comment responses) — those fail gracefully rather than crashing.

### 3. Install, migrate, run

```bash
npm install
npx prisma migrate dev
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

- `src/app` — routes (dashboard, wizard, editor, API routes)
- `src/components` — editor, comments, wizard, and settings UI
- `src/lib` — Prisma client, Auth.js config, Anthropic client + schemas,
  Markdown→ProseMirror conversion, and the ProseMirror document-mark helpers
  used to locate/replace commented text server-side
- `prisma/schema.prisma` — data model

## Deploying

1. Push to GitHub and import the repo into Vercel.
2. Provision a Neon Postgres database (Vercel Storage → Postgres, or
   directly on [neon.tech](https://neon.tech)) and set `DATABASE_URL`
   (pooled) / `DATABASE_URL_UNPOOLED` (direct) in the Vercel project's environment
   variables.
3. Set `AUTH_SECRET`, `NEXTAUTH_URL` (your production URL),
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`,
   `AUTH_EMAIL_FROM`, and `ANTHROPIC_API_KEY`. Install Stripe from the Vercel
   Marketplace for its API keys. Paid checkout remains hidden until
   `STRIPE_PRO_PRICE_ID` is set; webhook processing additionally requires
   `STRIPE_WEBHOOK_SECRET`.
4. Add your production callback URL
   (`https://<your-domain>/api/auth/callback/google`) to the Google OAuth
   client's authorized redirect URIs.
5. Run production migrations from the command line with
   `npm run db:migrate:prod`, using verified production `DATABASE_URL` (pooled)
   and `DATABASE_URL_UNPOOLED` (direct) credentials for the same database.
   Apply required schema changes before deploying application code that depends
   on them, and keep migration files committed in `prisma/migrations/`.

### Admin console

Set `ADMIN_EMAILS` to a comma-separated allowlist of account emails that may
access `/admin`. This value is a server-only secret.

Web Analytics page tracking is enabled through `@vercel/analytics`. Enable Web
Analytics for the Vercel project, then set the server-only `VERCEL_TOKEN` and
`VERCEL_PROJECT_ID` variables to show seven-day traffic totals and top routes
in `/admin`. Team-owned projects also require `VERCEL_TEAM_ID`.

### Founder feedback

Signed-in users can open `/feedback` from the persistent **Message founders**
launcher. Messages are stored as a private thread and emailed through Resend to
the comma-separated `FEEDBACK_NOTIFICATION_EMAILS` list. Each recipient must
also be included in `ADMIN_EMAILS`; the notification links directly to the
thread in `/admin/feedback`, where a founder can reply. Replies are saved to the
thread and emailed to the user.

### Password authentication

People can create an account at `/register` and sign in with email and password
at `/login`. Passwords are salted and hashed with Node.js scrypt; plaintext
passwords are never stored. Password accounts must verify their email before
signing in. Verification links expire after 24 hours, password-reset links
expire after one hour, and both are single-use. Run the committed Prisma
migrations and configure Resend before using these flows in production.

Authentication documentation is in `docs/authjs.md`,
`docs/rate-limiting.md`, and `docs/account-linking.md`.

### Beta access and billing

Registration is limited transactionally to 100 free beta accounts across
password and Google sign-in. Existing accounts receive the first beta places
when the billing migration is applied, and deleting an account makes its place
available again. Free beta access never requires a card.

Stripe setup, webhook events, and sandbox verification are documented in
`docs/billing.md`.
