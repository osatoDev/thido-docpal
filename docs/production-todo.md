# Thido production checklist

Last reviewed: 7 August 2026

This is the running source of truth for production-readiness work. Completed boxes indicate repository evidence or a verified check. External configuration remains unchecked until it is explicitly verified.

## Immediate deployment blockers

- [ ] Apply the `20260803170000_add_permissioned_share_links` migration to the production database before deploying permission-bearing link sharing.
- [ ] Apply the `20260802190000_add_document_revisions` migration to the production database before deploying version history, optimistic concurrency, or Word import.
- [x] Apply the `20260801130000_add_waitlist_and_document_images` migration to the production database before deploying the post-cap waitlist or document photos.
- [x] Apply the `20260801100000_add_auto_ai_comment_mode` migration to the production database before deploying the default Auto edit mode.
- [x] Apply the `20260731180000_add_founder_feedback` migration to the production database before deploying founder conversations or notification links.
- [x] Accept the Stripe Marketplace terms in Vercel, install the Stripe integration on `thido-docpal`, and connect the `stripe-cobalt-harbor` sandbox resource to Production, Preview, and Development.
- [x] Apply the `20260731160000_add_beta_access_and_billing` migration to the production database before deploying the 100-account gate or billing controls.
- [x] Apply the `20260731140000_add_comment_ai_job_state` migration to the production database before deploying whole-document AI locking.
- [x] Apply the `20260731120000_add_document_placeholder_state` migration to the production database before deploying placeholder document handling.
- [x] Apply the `20260731100000_add_document_comment_scope` migration to the production database before deploying first-class whole-document comments.
- [x] Apply the `20260729120000_add_ai_generation_observability` migration to the production database before deploying AI usage tracking and admin AI operations metrics.
- [x] Apply the `20260728120000_add_document_last_accessed_at` migration to the production database before deploying dashboard access timestamps.
- [x] Apply the `20260728100000_add_document_collaborators` migration to the production database before deploying email invitations and collaborator permissions.
- [x] Apply the `20260726130000_add_document_share_token` migration to the production database before deploying read-only share links.
- [x] Apply the `20260722143000_add_guest_draft_id` migration to the production database before deploying the guest-first flow.
- [x] Apply previously committed Prisma migrations through `20260722100000_add_auth_tokens` to the production database.
- [x] Resolve or confirm the Prisma baseline for the existing production database before running `prisma migrate deploy` if it still reports `P3005`.
- [x] Verify `npx prisma migrate status` reports all 14 production migrations through `20260731160000_add_beta_access_and_billing` are applied.
- [x] Verify `npx prisma migrate status` reports all 15 production migrations through `20260731180000_add_founder_feedback` are applied.
- [x] Verify `npx prisma migrate status` reports all 16 production migrations through `20260801100000_add_auto_ai_comment_mode` are applied.
- [x] Verify `npx prisma migrate status` reports all 17 production migrations through `20260801130000_add_waitlist_and_document_images` are applied.
- [x] Configure `RESEND_API_KEY` in Vercel Production and Preview environments.
- [x] Verify `thido.ai` is active in Resend and use `Thido <auth@thido.ai>` as both the code fallback and production `AUTH_EMAIL_FROM` sender.
- [ ] Send real verification and password-reset emails and confirm delivery, links, expiry, and single-use behavior against the production database.
- [ ] Confirm all required Vercel production environment variables are set:
  - [x] `DATABASE_URL`
  - [x] `DATABASE_URL_UNPOOLED`
  - [x] `AUTH_SECRET`
  - [x] `NEXTAUTH_URL` (`https://thido.ai` in Vercel Production)
  - [x] `GOOGLE_CLIENT_ID`
  - [x] `GOOGLE_CLIENT_SECRET`
  - [x] `RESEND_API_KEY`
  - [x] `AUTH_EMAIL_FROM`
  - [x] `BLOB_READ_WRITE_TOKEN` (private `thido-document-images` store linked to Production, Preview, and Development)
  - [x] `ANTHROPIC_API_KEY`
  - [x] `ADMIN_EMAILS` (`osato@thido.ai` in Production, Preview, and Development)
  - [x] `FEEDBACK_NOTIFICATION_EMAILS` (`osato@thido.ai` and `osatog1@gmail.com` in Production, Preview, and Development)
  - [x] `STRIPE_SECRET_KEY` (sandbox credentials provisioned by the Vercel Marketplace integration)
  - [ ] `STRIPE_PRO_PRICE_ID` (leave absent while paid checkout should remain hidden)
  - [ ] `STRIPE_WEBHOOK_SECRET`
  - [x] `NEXT_PUBLIC_ROLLBAR_THIDO_DOCPAL_CLIENT_TOKEN_1785444690`
  - [x] `ROLLBAR_THIDO_DOCPAL_SERVER_TOKEN_1785444690`
- [ ] Remove `ENABLE_TEST_LOGIN` from Production. It was still present in Vercel on 31 July 2026; the code hard-disables it in production, but the environment should also be clean.

## Database and migrations

- [x] Use PostgreSQL through Prisma.
- [x] Keep committed, ordered Prisma migration files.
- [x] Provide a production migration command: `npm run db:migrate:prod`.
- [x] Add a GitHub Actions workflow for production migrations.
- [ ] Create the GitHub `production` environment and add `DATABASE_URL` and `DATABASE_URL_UNPOOLED` secrets.
- [ ] Run the migration workflow manually once and verify it succeeds against production.
- [ ] Decide whether migration deployment remains automatic on changes to `main` or requires environment approval.
- [ ] Enable and verify Neon backups or point-in-time recovery.
- [ ] Document and test a database restore procedure.
- [ ] Set alerts for connection exhaustion, storage growth, and database errors.
- [ ] Define a policy for deleting expired `AuthToken` rows, even though expired tokens cannot be used.

## Authentication and account security

- [x] Support Google OAuth.
- [x] Allow Google to recover an existing same-email beta account only when Google supplies a verified-email claim, and make existing-user settings initialization idempotent during account linking.
- [x] Support email-and-password registration and login.
- [x] Store salted scrypt password hashes instead of plaintext passwords.
- [x] Require password accounts to verify their email.
- [x] Provide password-reset links with one-hour expiry.
- [x] Store only hashes of verification and reset tokens.
- [x] Make authentication tokens single-use and limit each user to one active token per purpose.
- [x] Invalidate existing JWT sessions after a password reset.
- [x] Detect sessions whose database user no longer exists.
- [x] Show explicit sign-in, expired-session, sign-out, verification, and password-reset notices.
- [x] Use a responsive wide login layout that keeps authentication controls readable without excessive desktop side margins.
- [x] Provide a dedicated forbidden page for authorization failures.
- [x] Add authenticated Settings controls that deliberately link Google or add password sign-in to the current account.
- [ ] Add recent-authentication checks before linking or unlinking credentials.
- [ ] Prevent users from removing their final usable sign-in method when account-management controls are added.
- [ ] Add security-notification emails for password changes and provider linking or unlinking.
- [ ] Add an account-level **sign out all devices** control.
- [ ] Decide whether multi-factor authentication is required before public launch or reserved for a later phase.
- [ ] Add an authentication audit log for significant security events.

## Google OAuth configuration

- [x] Add the final production callback URL to Google Cloud:
      `https://<production-domain>/api/auth/callback/google`.
- [ ] Configure the OAuth consent screen with the final product name, logo, domain, privacy-policy URL, and support email.
- [ ] Confirm the Google app's publishing status and test-user restrictions are appropriate for launch.
- [ ] Test new Google registration, returning Google login, denied consent, and same-email collision behavior in production.

## Email delivery

- [x] Integrate Resend with lazy server-side initialization.
- [x] Add verification and password-reset email content.
- [x] Keep recovery responses generic to avoid revealing whether an account exists.
- [ ] Configure SPF and DKIM records for the sending domain and confirm Resend reports the domain as verified.
- [ ] Add a DMARC policy and monitoring address for the sending domain.
- [ ] Decide how bounced, complained, and suppressed email events will be handled.
- [ ] Add and verify a Resend webhook if delivery status needs to be visible operationally.
- [ ] Monitor delivery, bounce, complaint, and suppression rates.

## Abuse prevention and rate limiting

- [x] Add best-effort limits for login, registration, verification email, password reset, and AI operations.
- [x] Use generic authentication and recovery responses where account enumeration is a concern.
- [ ] Replace the per-instance in-memory limiter with a shared atomic service such as Upstash Redis before meaningful public traffic.
- [ ] Add `Retry-After` information to HTTP `429` responses where possible.
- [ ] Configure Vercel Firewall rules for broad automated abuse and denial-of-service protection.
- [ ] Add alerts for sustained authentication, email, or AI rate-limit rejections.
- [ ] Set explicit per-user or per-plan AI allowances and spending alerts for every active model provider, using the token-aware internal guardrails in [the paid-plan pricing suggestions](./paid-plan-pricing.md) without exposing surprise raw-token overages to users.

## Application data and document storage

- [x] Store editable Thido document content and metadata in PostgreSQL.
- [x] Implement the limited guest-first drafting flow described in `docs/guest-document-flow.md`.
- [x] Keep complete and partial guest input local and restore it after sign-in initiated through either **Generate** or the page navigation; require authentication before AI generation or permanent database storage.
- [x] Let users switch between guided initial questions and a freeform prompt; retain tailored follow-ups for guided briefs and generate directly from freeform briefs.
- [x] Make a blank `READY` document the default signed-in creation path, give each fresh or reused blank placeholder a sortable UTC date-and-time title, and keep AI-guided drafting and paste-existing flows available as explicit alternatives.
- [x] Keep untouched blank editor sessions as hidden, reusable placeholders and count them as documents only after a custom title or meaningful body content is saved.
- [ ] Make AI-generated documents persist a meaningful document title instead of retaining `Untitled Document` when the generated body begins with a clear title.
- [x] Show a clear `BETA` status badge beside the shared Thido wordmark across the application.
- [x] Give signed-in users a consistent top-right profile image or initials menu with direct Settings and Log out actions.
- [x] Let document owners create, copy, open, and revoke unlisted read-only share links; public views expose the title, document body, and owner profile name while keeping email and other account details private.
- [ ] Make public share links owner-aware without automatically redirecting: when a signed-in owner opens their own link, retain the recipient-equivalent public rendering, label it as a public-link preview shared by them, and provide **Open original** and **Manage sharing** actions. The behavior and acceptance criteria are in [the shared-link owner experience](./shared-link-owner-experience.md).
- [ ] Deploy and browser-check permission-bearing **Anyone with the link** sharing for authenticated users, including visible controls with click-time session checks, post-authentication return to the selected action, immediate revocation, access logging, and explicit safeguards for full access; implementation and acceptance criteria are in [the full-access link-sharing design](./full-access-link-sharing.md).
- [x] Clearly identify who shared a document on the public read-only view, with a non-identifying owner label for legacy accounts that have no profile name.
- [x] Let full-access users invite collaborators by email with view, comment, edit, or full access; enforce those permissions on document, comment, suggestion, deletion, public-link, and sharing-management operations.
- [x] List documents shared directly with the signed-in email address on the dashboard and identify the owner.
- [x] Show each document's last-accessed timestamp on the dashboard and record successful authenticated or public document opens without delaying the response.
- [x] Provide an immediate prefetched loading state when dashboard document links navigate to dynamic document routes.
- [x] Close document-deletion confirmation dialogs after the authenticated deletion action completes.
- [x] Give dashboard document-link clicks an immediate selected-row state while preserving partial prefetch semantics for access tracking.
- [x] Use the pointer cursor consistently for enabled buttons and button-role controls across the app.
- [x] Reduce the document editor's stacked side gutters and widen its responsive canvas while retaining modest content padding.
- [x] Let users choose persisted disc, circle, or square markers for unordered lists across editing, sharing, and printing.
- [x] Keep explicit whole-document AI comment requests in the foreground with a visible working state while ordinary anchored comments continue in the background.
- [x] Provide a visible whole-document comment composer with explicit scope, full-document AI revisions, reviewable suggestions, and concurrency-safe auto-apply behavior.
- [x] Lock document editing and new comments while a whole-document AI action is active, reject competing work across tabs, and expire abandoned locks after ten minutes.
- [x] Let users expand a background comment response to see its real queued, processing, or failed state while it refreshes automatically.
- [x] Move resolved comment threads into a collapsible archive and retain the ability to reopen or delete them.
- [x] Let document viewers hide and restore the comments sidebar to reclaim document width, expose the state through an accessible toggle, support the Google Docs-style discussion shortcut `Ctrl/⌘ + Alt + Shift + A`, and automatically reopen the sidebar when starting a comment.
- [ ] Deploy and browser-check additional user messages and contextual Thido responses inside open AI comment threads, including failure recovery and whole-document locking.
- [x] Add Auto as the default AI edit mode, use the structured prompt decision to apply clear edit instructions while keeping questions and ambiguous requests as proposals, and retain explicit always-propose and always-apply overrides.
- [x] Keep the AI model and edit-application preferences in Settings instead of duplicating them in each document editor.
- [x] Show a dismissible recent Thido-change notice with the resulting text and keep durable changed-from/changed-to details in the comment thread.
- [x] Let dashboard users sort document rows instantly by title and last-accessed time without a server round trip.
- [x] Use an accessible trash icon for dashboard deletion while keeping the confirmation dialog tied to the selected document title.
- [x] Bind dashboard deletion to the clicked row's document ID in the server action instead of trusting a hidden form field.
- [x] Remove the default dashboard `READY` status column and show only non-ready document states inline with the title.
- [ ] Define and communicate which pasted rich-text structures are preserved; treat importing Word/Google Docs comments and tracked changes as a separate feature.
- [x] Implement the repository-backed Priority 0 foundations in the [Google Docs feature-gap analysis](./google-docs-feature-gap-analysis.md): bounded durable version history and restore, revision-based stale-write protection across user and AI changes, Word import/export, and server-generated PDF download.
- [x] Use the Google Docs-inspired hierarchy in [the document action layout recommendation](./document-action-layout.md): identity and collaboration controls on the first row, implemented **File / Edit / View / Insert / Format / Tools** menus below, and a compact icon formatting toolbar without standalone **Download**, **More**, or literal list buttons.
- [x] Label the existing task-list formatting control explicitly as **Checkbox list** so the checkbox bullet option is discoverable without relying on its icon.
- [x] Add a compact, Polymarket-inspired **How it works** home-navigation control that opens Thido's own accessible three-step walkthrough.
- [x] Give every signed-in route a persistent one-click **New document** action that reuses the safe blank-placeholder creation flow.
- [x] Document Word import/export behavior, unsupported structures, limits, and sanitization in the [file fidelity contract](./word-import-export.md).
- [x] Keep PDFKit external to the Next.js server bundle so its built-in AFM font files resolve correctly in deployed PDF exports.
- [x] Defer live ProseMirror collaboration, shared cursors, and presence; use revision-based stale-write rejection as the supported conflict-safety model for now. Revisit the infrastructure options only if simultaneous live editing becomes a product requirement. The decision context is documented in [why real-time collaboration needs dedicated infrastructure](./why-realtime-collaboration-infrastructure.md).
- [ ] Define and enforce the retention window and storage limits for durable document revisions.
- [ ] Browser-check version preview/restore, cross-tab stale-write recovery, Word import/export, and multi-page PDF output with supported formatting and images.
- [x] Add first-class safe HTTP(S)/email links, checklists, and small accessible tables with row/column controls, shared-schema rendering, and supported Word/PDF conversion.
- [x] Let editable-document users right-click a table cell to add or delete rows and columns, toggle the header row, or delete the table, while retaining the toolbar control for keyboard and touch access.
- [ ] Browser-check link editing, checklist toggling, table row/column controls, public rendering, printing, and representative Word/PDF output.
- [x] Add editor-aware Find, Replace, and Replace all with case-sensitive matching and accessible result counts; add document and selection word/character counts through the **Tools** menu.
- [x] Add the P0 menu commands **Insert link**, **Horizontal line**, and **Clear formatting**, with familiar keyboard access where applicable.
- [x] Browser-check the P0 menu set on desktop and a 390 px mobile viewport: verify Find and replace, document counts, link-control access, horizontal-line insertion, clear formatting, menu fit, and absence of a framework error overlay.
- [ ] Define and document Thido's spelling, grammar, and document-language experience.
- [ ] Add heading-based document navigation, internal links, a table of contents, page breaks, and footnotes before pursuing advanced page-layout controls.
- [ ] Add a human suggestion mode that shares a coherent accept/reject and history model with AI proposals.
- [ ] Add collaborator mentions, comment assignments, notification preferences, and filters for work needing a user's response.
- [ ] Defer offline editing until version history and conflict-safe synchronization are proven.
- [x] Support document photos through the shared TipTap schema, authenticated editor uploads, and scoped rendering in authenticated and public-share views.
- [x] Let users open the browser print dialog from authenticated and public document views, with print styling limited to the document title, formatted body, and images.
- [ ] Browser-check printing from authenticated and public document views in light and dark themes, including multi-page documents and images.
- [x] Provision the private `thido-document-images` Vercel Blob store and keep only Blob identifiers and image metadata in PostgreSQL.
- [x] Limit the initial document-photo upload path to 4 MB per JPEG, PNG, WebP, GIF, or AVIF image so uploads remain within the Vercel Function request limit.
- [x] Verify an authenticated editor can upload a real JPEG to the private Blob store, render it through the protected image route, and remove its Blob when the test document is deleted.
- [ ] Delete orphaned Blob objects when an uploaded image is removed from the editor or abandoned before the document autosave completes.
- [ ] Add data export and account deletion flows.
- [ ] Define retention rules for documents, comments, deleted accounts, auth tokens, and operational logs.
- [ ] Define a cleanup window for abandoned document placeholders that are no longer reusable.
- [ ] Verify cascade deletion behavior against the intended retention policy.

## Beta access and billing

- [x] Enforce a race-safe limit of 100 free beta accounts across password registration and Google sign-in, backfill existing accounts deterministically, show remaining places, and keep existing members able to sign in after the cap is reached.
- [x] Deploy the beta-access foundation to Vercel Production and verify the live `/register` page reports 93 of 100 places remaining for the seven seated accounts, with no card required.
- [x] After the first 100 automatic beta accounts, place password and verified-Google applicants on a waitlist and let an authenticated admin approve or reject the exact request with one click and an outcome email.
- [ ] Exercise password and Google waitlist entry, approval, rejection, duplicate submission, and approval-email delivery against production after the migration is deployed.
- [ ] Choose and approve paid-plan pricing, currency, billing interval, entitlements, and launch timing using [the paid-plan pricing suggestions](./paid-plan-pricing.md) before activating Stripe Checkout.
- [x] Prepare an accurate Stripe registration description for Thido as an AI-assisted document productivity SaaS in [the Stripe business description](./stripe-business-description.md).
- [x] Implement authenticated Stripe subscription Checkout, signed webhook processing, idempotent subscription-state persistence, failure reporting, and Customer Portal access using the Vercel Marketplace integration; keep Checkout hidden until a Price is configured.
- [ ] Claim and activate the currently sandbox-only Stripe account before accepting live payments.
- [ ] Create the approved recurring Stripe product and Price, then configure `STRIPE_PRO_PRICE_ID` only when paid checkout should become visible.
- [ ] Configure and verify the Stripe statement descriptor using the recommended `THIDO.AI` and shortened `THIDO` values in [the statement descriptor note](./stripe-statement-descriptor.md).
- [ ] Deploy `/api/webhooks/stripe`, subscribe it to Checkout completion and subscription lifecycle events, set `STRIPE_WEBHOOK_SECRET`, and configure the Customer Portal.
- [ ] Define retention and cleanup for processed `StripeWebhookEvent` idempotency records.
- [ ] Test Stripe sandbox checkout, renewal, failed payment, cancellation, webhook retries, and portal management without requiring free beta users to enter payment details.

## AI reliability and safety

- [x] Keep Anthropic calls on the server.
- [x] Validate structured AI responses with schemas where implemented.
- [ ] Exercise Auto mode in production with representative direct orders, questions, polite requests, and ambiguous prompts; confirm only clear edit instructions are automatically applied.
- [x] Fail gracefully when AI generation is temporarily unavailable.
- [x] Give comment-driven revisions bounded surrounding-document context while keeping replacements constrained to the active comment anchor, with deliberate paragraph-scope expansion for broader rewrite prompts.
- [x] Ensure document content and its comment anchor are durably saved before an anchored AI comment can be submitted.
- [ ] Configure production usage and spending limits for every active model provider.
- [ ] Add timeouts, retries with backoff, and request correlation IDs for AI calls.
- [ ] Prevent long selection-level structured comment responses from failing at the 1,024-token ceiling; classify truncation separately, retry with an appropriate budget, and retain provider usage/request metadata when SDK parsing fails.
- [x] Implement durable model usage, latency, first-token timing, feature failures, structured logs, versioned cost estimates, and seven-day admin metrics for every current AI feature ([implementation guide](./ai-usage-observability.md)).
- [ ] After applying the AI observability migration, run each AI feature in production and reconcile its stored usage and estimated cost against the Anthropic Console.
- [x] Define how user documents may be sent to AI providers in the privacy policy.
- [ ] Publish and maintain a current AI-provider and subprocessor list without making the core Privacy Policy provider-specific.
- [ ] Review prompt-injection and untrusted-document risks before supporting uploaded source material.
- [ ] Add moderation or acceptable-use controls if public users can generate arbitrary content.

## Testing and continuous integration

- [ ] Validate the assumptions in [Can the current version of Thido support 100 users?](./can-thido-support-100-users.md) with an isolated staging load test at 10, 25, 50, and 100 concurrent virtual users before making a concurrent-capacity claim.
- [x] Add automated unit tests for authentication input, password hashing, token helpers, rate limiting, and API auth responses.
- [x] Confirm the current unit suite passes: 97 tests across thirty files, including editor text search/counting, reviewed beta-seat allocation, timestamped reusable placeholders, private-image public-share URL coverage, safe links, persisted bullet/checklist/table structures, revision coalescing, import sanitization, Word/PDF generation, link-derived authorization, and AI comment conversation ordering.
- [x] Apply all nineteen migrations to an isolated temporary PostgreSQL instance and browser-check visible full-access link controls, click-time authentication with action return, full editor access, link-access activity, immediate revocation, and an additional user/AI message pair in an existing whole-document comment thread.
- [x] Browser-check the rendered connected-accounts Settings panel, empty admin approval waitlist, and editor image insertion control with no framework overlay or browser errors.
- [x] Deploy the connected-accounts, private document-photo, post-cap waitlist, verified auth sender, and analytics-status changes to Vercel Production (`dpl_6tYbWWaY4rT5FdFEBrkyGRQRjjHd`) and smoke-check the live login and registration pages without browser errors.
- [x] Confirm type checking, lint, Prisma validation, and the production build pass after the founder-feedback implementation.
- [x] Confirm type checking, lint, Prisma validation, and the production build pass after the verified-Google-email account-linking fix.
- [x] Prevent the founder-feedback POST runtime crash by keeping non-function state out of the `"use server"` action module and scanning every server-action module for invalid runtime exports in the unit suite.
- [x] Fix new-user Google OAuth registration by casting the PostgreSQL advisory-lock result to a Prisma-supported type, verify it against PostgreSQL, and retain a regression assertion for the lock query.
- [ ] Add a normal CI workflow that runs `npm ci`, `npm test`, `npm run lint`, and `npm run build` for pull requests and `main`.
- [ ] Add database integration tests for issuing and consuming verification and reset tokens transactionally.
- [ ] Add browser tests for registration, email verification, password reset, Google login, sign-out, stale sessions, and admin authorization.
- [ ] Add browser tests for pasted rich text, autosave, comment anchoring, AI suggestion accept/reject, concurrent edits, and orphaned comments.
- [ ] Add browser tests for creating, proposing, accepting, rejecting, and auto-applying whole-document comments, including cross-tab edit and comment locking.
- [ ] Add browser tests for creating, opening anonymously, and revoking read-only document share links, plus inviting by email and enforcing every collaborator permission level.
- [ ] Add automated billing tests for offer gating, authenticated Checkout and duplicate-subscription prevention, webhook signature rejection and idempotency, subscription-state transitions, and Customer Portal authorization; current status is summarized in [the paid-plan implementation status](./paid-plan-implementation-status.md).
- [ ] Create a separate test database and ensure tests can never target production credentials.
- [ ] Add accessibility checks for authentication, editor, settings, and admin pages.
- [ ] Review and resolve the seven dependency audit findings reported after adding Vercel Blob and TipTap Image (five high and two critical) without applying an unreviewed breaking upgrade.
- [ ] Define a release smoke-test checklist for production deployments.

## Monitoring and operations

- [x] Add Vercel Web Analytics page tracking.
- [x] Add an admin analytics summary integration.
- [x] Accept the Rollbar Marketplace terms in Vercel, install `rollbar/error-tracking` on the `thido-docpal` project, connect it to production, preview, and development, and pull the generated client and server tokens.
- [x] Verify the Rollbar server token and connected project accept a content-free development occurrence.
- [x] Verify through the Vercel project API that production Web Analytics is enabled and has received data.
- [ ] Configure `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID` when required for the admin analytics view.
- [ ] Verify `/admin` shows real production analytics and system configuration status.
- [ ] Verify analytics, request logs, and error tracking record `/share/[token]` as a route pattern rather than storing bearer-token values; exclude or redact shared-document paths where necessary.
- [ ] Add content-free funnel events for guest outline start, authentication checkpoint, successful login return, and document claim.
- [x] Add privacy-conscious Rollbar browser and server error tracking, Next.js error boundaries, framework request-error capture, and explicit reporting for handled AI and email failures.
- [ ] Add structured server logging with request correlation IDs and secret redaction.
- [ ] Configure alerts for elevated 5xx responses, function timeouts, email failures, database failures, and AI-provider failures.
- [ ] Configure production-only Rollbar rules for new errors, reactivated errors, and repeated failures, then verify email delivery with a controlled deployed error.
- [ ] Write incident-response and rollback instructions.
- [ ] Verify Vercel deployment rollback and Neon restore procedures.

## Security and dependency management

- [x] Keep current Next.js and React versions above the critical patched minimums recorded in project guidance.
- [ ] Upgrade Next.js from 16.2.10 to a patched 16.2.12 or newer compatible release and verify the current `sharp` and `postcss` advisories are resolved.
- [ ] Upgrade `next-auth` and `@auth/prisma-adapter` to releases containing the July 2026 Auth.js authorization, token-validation, email-normalization, and OAuth-cookie fixes, then rerun the authentication test matrix.
- [ ] Add Dependabot or Renovate for dependency update pull requests.
- [ ] Audit the 15 vulnerabilities currently reported by `npm install` (13 high and 2 critical), identify which are production-reachable, and upgrade affected dependencies without using a blind force-fix.
- [ ] Add a Content Security Policy and review other security headers.
- [ ] Confirm secrets are only stored in Vercel/GitHub secret stores and never committed.
- [ ] Rotate any secret that may have appeared in terminal output, screenshots, chat, or repository history.
- [ ] Review cookie settings and production host configuration on the final HTTPS domain.
- [ ] Perform a focused authorization review of every Server Action and Route Handler.
- [ ] Add a vulnerability-reporting contact or `security.txt` before a broad public launch.

## Domain, deployment, and environments

- [x] Confirm `thido.ai` and `www.thido.ai` are attached as aliases to the current Vercel production deployment.
- [x] Add the apex `thido.ai` A record in Route 53 (`216.198.79.1`, `76.76.21.21`) so the bare domain resolves. Note: the first attempt used record name `@.thido.ai`, which Route 53 treats as a literal hostname, not the zone apex — the apex record must be created with an empty record name. Fixed and confirmed via `dig thido.ai A`.
- [x] Add `thido.ai` (not only `www.thido.ai`) as a Vercel Domain and verify the apex responds successfully over HTTPS.
- [ ] Verify DNS, HTTPS certificate issuance, and canonical redirects.
- [x] Set `NEXTAUTH_URL` to the final HTTPS origin and verify the live Google authorization request uses the production callback URL.
- [x] Exclude local `.env` files from Vercel deployment uploads so local URLs and secrets cannot override managed production variables.
- [ ] Create a Preview or staging environment with isolated database and email configuration.
- [ ] Ensure Preview deployments never use the production database by default.
- [ ] Decide whether Neon database branches should be created for Preview deployments.
- [ ] Verify production and preview environment-variable scopes separately.
- [ ] Verify the migration workflow and Vercel deployment ordering cannot deploy code that requires an unapplied schema.

## Product, privacy, and support

- [x] Publish Terms of Service and a Privacy Policy at `/terms` and `/privacy`.
- [x] State how documents, prompts, account data, analytics, and AI-provider processing are handled.
- [x] Disclose Stripe-hosted billing, the billing identifiers Thido stores, and that Thido does not store full card numbers.
- [x] Enrich the first-time document-start page with a returning-user header action, a dropdown of more than ten document starters that replace the current outline, guest-flow reassurance, and a concise explanation of what happens after submission.
- [x] Default first-time visitors to light mode while retaining an explicit light or dark preference across visits.
- [x] Make guided brief and follow-up fields optional, clearly identify that Thido can infer omitted details, and require only one initial piece of direction before generation.
- [x] Use a consistent wide responsive shell across full-page surfaces and require an accessible confirmation with a visible pending state before deleting documents.
- [ ] Have qualified counsel review the policies for Thido's intended markets before public launch.
- [ ] Add the operator's complete legal name, business address, and specific governing law once confirmed.
- [ ] Create and monitor `legal@thido.ai`, `privacy@thido.ai`, and `support@thido.ai`, or replace them in the policies with verified contact addresses.
- [ ] Provide a support contact for login, billing, privacy, and data-deletion requests.
- [x] Add the signed-in **Message founders** experience described in [the founder feedback plan](./founder-feedback.md): a persistent launcher, private threads, an admin inbox, direct email links for founder replies, reply emails to users, safe optional page context, and no automatic document-content capture.
- [ ] Assign operational ownership for founder messages, alert when two hours remain, measure first-response time, and confirm that overnight and weekend coverage can support the displayed eight-hour response promise.
- [x] Update the Privacy Policy with feedback-message contents, optional page context, notifications, access, and current retention behavior.
- [ ] Define the intended launch audience, acceptable-use policy, and abuse-response process.
- [ ] Review GDPR obligations, including lawful basis, data access, deletion, retention, and subprocessors, for the intended markets.
- [ ] Add a user-facing status or incident communication channel if reliability expectations require it.

## Final launch verification

- [x] Create and sign in to a fresh production password account, complete email verification through the delivered `auth@thido.ai` message, and retain the dedicated `osatog1+thido-automation@gmail.com` account in the local encrypted browser-auth vault for future Thido requests.
- [ ] Reset that account's password and confirm older sessions become invalid.
- [ ] Create and sign in with a fresh Google account.
- [ ] Confirm a non-admin cannot access `/admin` and an allowlisted admin can.
- [ ] Create, generate, edit, comment on, and delete a document.
- [ ] Create a document share link, open it while signed out, revoke it, and confirm the old link no longer works.
- [ ] Invite fresh accounts with view, comment, edit, and full access; confirm delivery and verify each account can perform only its allowed operations.
- [ ] Verify AI failures produce understandable recovery states.
- [ ] Verify a free beta registration never requests a card and account 101 is rejected across password and Google registration without affecting existing users.
- [ ] Send a founder message in Production, confirm the configured inbox receives the direct private-thread link, reply from `/admin/feedback`, and confirm the user receives the reply email and sees it in Thido.
- [ ] If paid plans are activated, complete a Stripe sandbox checkout, portal cancellation, failed-payment update, and duplicate-webhook test before switching to live credentials.
- [ ] Verify analytics events appear without exposing document content or secrets.
- [ ] Test the application on current mobile and desktop browsers.
- [ ] Confirm backups, monitoring, alerts, support contact, and rollback ownership before announcing launch.
