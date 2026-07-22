# Thido production checklist

Last reviewed: 22 July 2026

This is the running source of truth for production-readiness work. Completed boxes indicate repository evidence or a verified check. External configuration remains unchecked until it is explicitly verified.

## Immediate deployment blockers

- [x] Apply all committed Prisma migrations to the production database, including `20260722100000_add_auth_tokens`.
- [x] Resolve or confirm the Prisma baseline for the existing production database before running `prisma migrate deploy` if it still reports `P3005`.
- [x] Verify `npx prisma migrate status` reports that the production schema is up to date.
- [ ] Configure `RESEND_API_KEY` in Vercel Production and Preview environments as appropriate.
- [ ] Verify the sending domain in Resend and replace `onboarding@resend.dev` with a production `AUTH_EMAIL_FROM` address.
- [ ] Send real verification and password-reset emails and confirm delivery, links, expiry, and single-use behavior against the production database.
- [ ] Confirm all required Vercel production environment variables are set:
  - [ ] `DATABASE_URL`
  - [ ] `DATABASE_URL_UNPOOLED`
  - [ ] `AUTH_SECRET`
  - [ ] `NEXTAUTH_URL`
  - [ ] `GOOGLE_CLIENT_ID`
  - [ ] `GOOGLE_CLIENT_SECRET`
  - [ ] `RESEND_API_KEY`
  - [ ] `AUTH_EMAIL_FROM`
  - [ ] `ANTHROPIC_API_KEY`
  - [ ] `ADMIN_EMAILS`
- [ ] Confirm `ENABLE_TEST_LOGIN` is absent from Production. The code disables it in production, but the environment should also be clean.

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
- [x] Support email-and-password registration and login.
- [x] Store salted scrypt password hashes instead of plaintext passwords.
- [x] Require password accounts to verify their email.
- [x] Provide password-reset links with one-hour expiry.
- [x] Store only hashes of verification and reset tokens.
- [x] Make authentication tokens single-use and limit each user to one active token per purpose.
- [x] Invalidate existing JWT sessions after a password reset.
- [x] Detect sessions whose database user no longer exists.
- [x] Show explicit sign-in, expired-session, sign-out, verification, and password-reset notices.
- [x] Provide a dedicated forbidden page for authorization failures.
- [ ] Add an authenticated connected-accounts screen for deliberately linking Google and password credentials.
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
- [ ] Set explicit per-user or per-plan AI quotas and spending alerts for every active model provider.

## Application data and document storage

- [x] Store editable Thido document content and metadata in PostgreSQL.
- [ ] Decide whether Thido will support uploaded source files, exports, images, or attachments.
- [ ] If binary files are added, provision object storage such as Vercel Blob or S3 and store only object metadata and keys in PostgreSQL.
- [ ] Define maximum document size and API request-body limits.
- [ ] Add data export and account deletion flows.
- [ ] Define retention rules for documents, comments, deleted accounts, auth tokens, and operational logs.
- [ ] Verify cascade deletion behavior against the intended retention policy.

## AI reliability and safety

- [x] Keep Anthropic calls on the server.
- [x] Validate structured AI responses with schemas where implemented.
- [x] Fail gracefully when AI generation is temporarily unavailable.
- [ ] Configure production usage and spending limits for every active model provider.
- [ ] Add timeouts, retries with backoff, and request correlation IDs for AI calls.
- [ ] Track model usage, latency, failures, and estimated cost per feature.
- [x] Define how user documents may be sent to AI providers in the privacy policy.
- [ ] Publish and maintain a current AI-provider and subprocessor list without making the core Privacy Policy provider-specific.
- [ ] Review prompt-injection and untrusted-document risks before supporting uploaded source material.
- [ ] Add moderation or acceptable-use controls if public users can generate arbitrary content.

## Testing and continuous integration

- [x] Add automated unit tests for authentication input, password hashing, token helpers, rate limiting, and API auth responses.
- [x] Confirm the current unit suite passes: 11 tests across five files.
- [x] Confirm lint and the production build pass after the authentication upgrade.
- [ ] Add a normal CI workflow that runs `npm ci`, `npm test`, `npm run lint`, and `npm run build` for pull requests and `main`.
- [ ] Add database integration tests for issuing and consuming verification and reset tokens transactionally.
- [ ] Add browser tests for registration, email verification, password reset, Google login, sign-out, stale sessions, and admin authorization.
- [ ] Create a separate test database and ensure tests can never target production credentials.
- [ ] Add accessibility checks for authentication, editor, settings, and admin pages.
- [ ] Define a release smoke-test checklist for production deployments.

## Monitoring and operations

- [x] Add Vercel Web Analytics page tracking.
- [x] Add an admin analytics summary integration.
- [ ] Enable Vercel Web Analytics for the production project.
- [ ] Configure `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID` when required for the admin analytics view.
- [ ] Verify `/admin` shows real production analytics and system configuration status.
- [ ] Add application error tracking, for example Sentry or an equivalent service.
- [ ] Add structured server logging with request correlation IDs and secret redaction.
- [ ] Configure alerts for elevated 5xx responses, function timeouts, email failures, database failures, and AI-provider failures.
- [ ] Write incident-response and rollback instructions.
- [ ] Verify Vercel deployment rollback and Neon restore procedures.

## Security and dependency management

- [x] Keep current Next.js and React versions above the critical patched minimums recorded in project guidance.
- [ ] Review the current `npm audit` findings for inherited `sharp` and `postcss` advisories; do not use the suggested forced downgrade to Next.js 9.
- [ ] Add Dependabot or Renovate for dependency update pull requests.
- [ ] Add a Content Security Policy and review other security headers.
- [ ] Confirm secrets are only stored in Vercel/GitHub secret stores and never committed.
- [ ] Rotate any secret that may have appeared in terminal output, screenshots, chat, or repository history.
- [ ] Review cookie settings and production host configuration on the final HTTPS domain.
- [ ] Perform a focused authorization review of every Server Action and Route Handler.
- [ ] Add a vulnerability-reporting contact or `security.txt` before a broad public launch.

## Domain, deployment, and environments

- [ ] Confirm the final production domain and attach it to the Vercel project.
- [ ] Verify DNS, HTTPS certificate issuance, and canonical redirects.
- [ ] Set `NEXTAUTH_URL` to the final HTTPS origin.
- [ ] Create a Preview or staging environment with isolated database and email configuration.
- [ ] Ensure Preview deployments never use the production database by default.
- [ ] Decide whether Neon database branches should be created for Preview deployments.
- [ ] Verify production and preview environment-variable scopes separately.
- [ ] Verify the migration workflow and Vercel deployment ordering cannot deploy code that requires an unapplied schema.

## Product, privacy, and support

- [x] Publish Terms of Service and a Privacy Policy at `/terms` and `/privacy`.
- [x] State how documents, prompts, account data, analytics, and AI-provider processing are handled.
- [ ] Have qualified counsel review the policies for Thido's intended markets before public launch.
- [ ] Add the operator's complete legal name, business address, and specific governing law once confirmed.
- [ ] Create and monitor `legal@thido.ai`, `privacy@thido.ai`, and `support@thido.ai`, or replace them in the policies with verified contact addresses.
- [ ] Provide a support contact for login, billing, privacy, and data-deletion requests.
- [ ] Define the intended launch audience, acceptable-use policy, and abuse-response process.
- [ ] Review GDPR obligations, including lawful basis, data access, deletion, retention, and subprocessors, for the intended markets.
- [ ] Add a user-facing status or incident communication channel if reliability expectations require it.

## Final launch verification

- [ ] Create a fresh password account in production and complete email verification.
- [ ] Reset that account's password and confirm older sessions become invalid.
- [ ] Create and sign in with a fresh Google account.
- [ ] Confirm a non-admin cannot access `/admin` and an allowlisted admin can.
- [ ] Create, generate, edit, comment on, and delete a document.
- [ ] Verify AI failures produce understandable recovery states.
- [ ] Verify analytics events appear without exposing document content or secrets.
- [ ] Test the application on current mobile and desktop browsers.
- [ ] Confirm backups, monitoring, alerts, support contact, and rollback ownership before announcing launch.
