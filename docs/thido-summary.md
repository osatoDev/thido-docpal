# Thido: stack, timeline, features, and public-usability summary

Status checked: 13 August 2026, from `package.json`, `README.md`, git history, and `docs/production-todo.md`.

## What it is

An AI document-creation platform: a user answers a short questionnaire or gives a freeform prompt, Claude drafts the first version, and the user edits it in a Google Docs-like rich text editor. Highlighting text lets the user ask the AI a question or request an edit, applied inline or directly to the document depending on settings.

## Stack

- **Framework**: Next.js (App Router) + TypeScript + Tailwind CSS, deployed on Vercel.
- **Database**: PostgreSQL (Neon in production) via Prisma, with committed migrations and a GitHub Actions migration workflow.
- **Auth**: Auth.js v5 (`next-auth`) with Google OAuth and email/password, `@auth/prisma-adapter`.
- **Editor**: Tiptap/ProseMirror, with a custom `CommentMark` extension anchoring comments to text spans.
- **AI**: `@anthropic-ai/sdk` calling Claude (`claude-opus-4-8`) for the drafting wizard and inline AI comment/edit responses, always server-side.
- **Billing**: Stripe hosted Checkout and Customer Portal, provisioned through the Vercel Marketplace integration.
- **Email**: Resend, for verification, password-reset, and notification emails.
- **File storage**: Vercel Blob for document photos.
- **Import/export**: `mammoth`, `officeparser`, `word-extractor`, `docx`, `pdfkit`, `marked`, `sanitize-html` for Word/Markdown/.txt/.odt/.rtf import and Word/PDF export.
- **Observability**: Rollbar (client + server error tracking) and Vercel Web Analytics.
- **Testing**: Vitest, with roughly 190+ unit tests as of the latest recorded run in `production-todo.md`.

## Development timeframe

- First commit: **8 July 2026** (Next.js scaffold).
- Substantive development began **12 July 2026**.
- Most recent commit: **12 August 2026**.
- **84 commits** total — roughly **5 weeks** of active, fast-paced development as of today (13 August 2026).

## Main features implemented

**Drafting and editing**
- Guest-first AI drafting flow (guided questions or freeform prompt) that requires sign-in only before generation or permanent storage.
- Full-featured rich text editor: headings with a navigable outline, tables, checklists with reordering, footnotes, table of contents, bookmarks, page breaks, zoom, alignment/spacing/typography controls, five global app styles (Classic, Clean, Editorial, Warm, Bold), find/replace, and dozens of other Google Docs-parity commands.
- AI-assisted editing: reviewers queue anchored or whole-document comments, then an editor asks Thido to action them together as one coherent full-document revision with safe document locking.
- Comments: anchored inline comments and first-class whole-document threads, additional queued context, batch loading and retry states, and archiving/resolving in a collapsible sidebar.
- Durable version history with restore, and revision-based stale-write protection for concurrent edits.

**Document management**
- Dashboard with folders, sorting, word counts, last-accessed timestamps, and trash/delete.
- First-class spreadsheets (autosaving grid, formulas, tabular paste) alongside documents.
- Document photo uploads.
- Import: Word (.docx/.doc), Markdown, .txt, .odt, .rtf. Export: Word and PDF.

**Sharing and collaboration**
- Read-only public share links.
- Email-based collaborator invitations with view/comment/edit/full-access permission levels, enforced across document, comment, and sharing operations.

**Accounts and billing**
- Google OAuth and email/password auth with verification, password reset, and rolling sessions.
- A capped free beta: 100 automatic accounts, then a waitlist with admin approval.
- Stripe subscription Checkout, signed webhook processing, and Customer Portal access are implemented but **not activated** (see below).

**Support and operations**
- In-app founder-feedback channel with a private per-user thread and an admin inbox with reply-by-email.
- Admin console: usage analytics, user/document/comment metadata, waitlist approvals, AI usage/cost observability.
- Rollbar error tracking and Vercel analytics in production.

## Is it publicly usable today?

**Partially.** It is live and working for a limited audience, but not launched as a general commercial product:

- The app is deployed at `thido.ai` with HTTPS and Google OAuth configured for the production domain.
- Anyone can register, but registration is gated: the first 100 accounts get free beta access with no card required; further signups go to a waitlist for manual admin approval.
- The Stripe billing foundation exists but paid checkout is **deliberately hidden** — no `STRIPE_PRO_PRICE_ID` or `STRIPE_WEBHOOK_SECRET` is configured, the Stripe account is sandbox-only, and paid status does not yet gate any product entitlement. See [paid-plan-implementation-status.md](./paid-plan-implementation-status.md).
- Per [production-todo.md](./production-todo.md), several items remain open before a broad public launch would be advisable: some database migrations (spreadsheets, permissioned share links, document revisions, document-title-intent) still need to be applied to production; the shared in-memory rate limiter, security-header/CSP work, dependency-vulnerability remediation, backup/restore verification, CI, and a documented employee-data-access model are all unfinished.

**Bottom line**: Thido works today for its capped beta users under a free, no-card plan. It is not yet open for unrestricted public signup or paid subscriptions, and a number of production-hardening tasks are still tracked as outstanding.
