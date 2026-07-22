# Thido

An AI document-creation platform: answer a short questionnaire, let Claude
draft the first version, then edit it in a Google-Docs-like editor. Highlight
any text to ask the AI a question or request a change — it replies inline or
edits the document directly, based on your settings.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- PostgreSQL + Prisma
- Auth.js v5 (Google OAuth and email/password) + `@auth/prisma-adapter`
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
| `ANTHROPIC_API_KEY` | [Anthropic Console](https://console.anthropic.com/settings/keys) |

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
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `ANTHROPIC_API_KEY`.
4. Add your production callback URL
   (`https://<your-domain>/api/auth/callback/google`) to the Google OAuth
   client's authorized redirect URIs.
5. In the GitHub repository, create a `production` environment and add
   `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) as environment
   secrets. The `Production database migrations` workflow applies committed
   Prisma migrations whenever migration-related files reach `main`. It can also
   be run manually from the repository's Actions tab.

### Admin console

Set `ADMIN_EMAILS` to a comma-separated allowlist of account emails that may
access `/admin`. This value is a server-only secret.

Web Analytics page tracking is enabled through `@vercel/analytics`. Enable Web
Analytics for the Vercel project, then set the server-only `VERCEL_TOKEN` and
`VERCEL_PROJECT_ID` variables to show seven-day traffic totals and top routes
in `/admin`. Team-owned projects also require `VERCEL_TEAM_ID`.

### Password authentication

People can create an account at `/register` and sign in with email and password
at `/login`. Passwords are salted and hashed with Node.js scrypt; plaintext
passwords are never stored. Run the committed Prisma migrations before using
this flow in a deployed environment. Password reset and email verification are
not configured yet; users who lose an email/password credential will need
operator assistance until a reset flow is added.
