# Thido production checklist

Last reviewed: 18 August 2026

This is the running source of truth for production-readiness work. Completed boxes indicate repository evidence or a verified check. External configuration remains unchecked until it is explicitly verified.

## Immediate deployment blockers

- [ ] Apply the `20260813150000_add_checklist_move_controls_setting` migration to the production database before deploying the checklist arrows Settings toggle. Written on 13 August 2026 against the local schema only, for the same `DATABASE_URL`-points-at-production reason noted below; not applied or verified against any live database in this session.
- [ ] Apply the `20260813120000_add_ai_credit_allowance` migration to the production database before deploying per-plan AI allowance enforcement. Written and reviewed on 13 August 2026 against the local schema only; not applied or verified against any live database in this session because the effective local `DATABASE_URL` points at the production `neondb` instance, so no `prisma migrate`/`db push`/`migrate status` command was run against it. Apply and verify through the normal migration workflow before relying on this gate in production.
- [ ] Apply the `20260809180000_add_spreadsheets` migration to the production database before deploying spreadsheet creation, editing, or dashboard integration. `npx prisma migrate status` confirmed on 10 August 2026 that it is pending on the currently configured `neondb` database.
- [ ] Apply the `20260809160000_add_document_title_intent` migration before deploying persisted manual-title protection and heading-derived automatic titles.
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
- [x] Keep ordinary login sessions alive with a rolling 400-day browser-compliant JWT lifetime, while preserving explicit logout and server-side invalidation after password resets, account deletion, or access removal.
- [x] Show explicit sign-in, expired-session, sign-out, verification, and password-reset notices.
- [x] Use a responsive wide login layout that keeps authentication controls readable without excessive desktop side margins.
- [x] Provide a dedicated forbidden page for authorization failures.
- [x] Add authenticated Settings controls that deliberately link Google or add password sign-in to the current account.
- [ ] Add recent-authentication checks before linking or unlinking credentials.
- [ ] Prevent users from removing their final usable sign-in method when account-management controls are added.
- [x] Add security-notification emails for password changes and provider linking. Password resets send `sendPasswordChangedEmail`; connecting Google (via the Auth.js `linkAccount` event) or adding a password credential in Settings send `sendSignInMethodAddedEmail`. No credential-unlinking feature exists yet to notify about.
- [x] Add an account-level **sign out all devices** control (`signOutAllDevices` in `src/app/account-actions.ts`, in Settings). It reuses the existing `sessionVersion` invalidation mechanism from password reset to invalidate every outstanding JWT for the account, then signs out the current browser.
- [ ] Decide whether multi-factor authentication is required before public launch or reserved for a later phase.
- [ ] Add an authentication audit log for significant security events.

## Google OAuth configuration

- [x] Add the final production callback URL to Google Cloud:
      `https://<production-domain>/api/auth/callback/google`.
- [ ] Configure the OAuth consent screen with the final product name, logo, domain, privacy-policy URL, and support email.
- [x] Confirm the Google app's publishing status: Google Cloud Console showed **Publishing status: In production** and **User type: External** on 17 August 2026, so sign-in is not restricted to a pre-added test-user allowlist (Testing mode would cap sign-in to explicitly listed testers even though its own cap is also 100, which is unworkable for anonymous Reddit traffic).
- [x] Submit the app for Google verification before relying on Google sign-in for public/Reddit-driven traffic. Google Auth Platform → Branding showed **"Your branding has been verified and is being shown to users"** on 18 August 2026 (app name "Thido", support email `osato@thido.ai`). Since `src/lib/auth.ts` only requests the default basic `openid`/`email`/`profile` scopes, branding verification is the relevant review tier (no sensitive/restricted-scope security assessment required), so this should remove the "Google hasn't verified this app" interstitial and lift practical exposure to the Audience page's 100-user OAuth cap. Not yet confirmed live end-to-end — that's covered by the still-open item below.
- [ ] Test new Google registration, returning Google login, denied consent, and same-email collision behavior in production. A live Google sign-in was confirmed working in production on 18 August 2026; denied consent and same-email collision behavior remain unverified.

## Email delivery

- [x] Integrate Resend with lazy server-side initialization.
- [x] Add verification and password-reset email content.
- [x] Keep recovery responses generic to avoid revealing whether an account exists.
- [x] Configure SPF and DKIM records for the sending domain and confirm Resend reports the domain as verified. Resend dashboard screenshot on 18 August 2026 showed `thido.ai` as Verified (provider Amazon Route 53) with DKIM (`resend._domainkey` TXT) and SPF (`send` MX + TXT) both reporting Verified.
- [x] Add a DMARC policy and monitoring address for the sending domain. `dig +short txt _dmarc.thido.ai` confirmed on 18 August 2026 that the live record is `v=DMARC1; p=none; rua=mailto:data@thido.ai; fo=1`, per [dmarc-setup.md](./dmarc-setup.md); `data@thido.ai` was confirmed as the intended, working monitoring mailbox.
- [ ] Watch `p=none` DMARC reports at `data@thido.ai` for 1-2 weeks to confirm every legitimate `@thido.ai` source (Resend, and anything else) passes SPF/DKIM alignment, then progress the policy from `p=none` to `p=quarantine` to `p=reject` per [dmarc-setup.md](./dmarc-setup.md#4-roll-out-gradually).
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
- [x] Set explicit per-user, per-plan monthly AI action allowances (Free beta and Pro) gating document generation, follow-up questions, and comment AI responses, using the credits-not-tokens hybrid model from [the paid-plan pricing suggestions](./paid-plan-pricing.md); implemented in `src/lib/entitlements.ts`, surfaced as a usage meter in Settings, and covered by unit tests. The specific monthly limits (30 free / 300 pro) and action weights are a functional default pending business approval, not a final published entitlement.
- [ ] Replace the best-effort, read-then-write AI credit consumption in `checkAndConsumeAiAllowance` with a race-safe accounting method, and add spending alerts (in addition to the action-count allowance) for every active model provider.

## Application data and document storage

- [x] Store editable Thido document content and metadata in PostgreSQL.
- [x] Implement the limited guest-first drafting flow described in `docs/guest-document-flow.md`.
- [x] Keep complete and partial guest input local and restore it after sign-in initiated through either **Generate** or the page navigation; require authentication before AI generation or permanent database storage.
- [x] Let users switch between guided initial questions and a freeform prompt; retain tailored follow-ups for guided briefs and generate directly from freeform briefs.
- [x] Make a blank `READY` document the default signed-in creation path, give each fresh or reused blank placeholder a UTC-backed date-and-time title displayed in the user's local timezone, and keep AI-guided drafting and paste-existing flows available as explicit alternatives.
- [x] Make `thido.ai` open the signed-in user's reusable blank Thido document by default, retain a persisted Settings option to reopen the most recently accessed document, fall back safely to a blank document when no recent document exists, and reserve document-type choices for an explicit creation action.
- [x] Keep untouched blank editor sessions as hidden, reusable placeholders and count them as documents only after a custom title or meaningful body content is saved.
- [x] Infer unnamed document titles from the first meaningful heading for typed, imported, and AI-generated content, persist whether a user deliberately named a document, and prevent later automatic inference from overwriting that deliberate title.
- [x] Add a safe, descriptive current-title slug to a document's editor URL after its first non-placeholder title is successfully persisted; keep the document ID authoritative, canonicalize ID-only and stale links, update internal and invitation links, preserve query/hash state without reloading, and redact title slugs from feedback context and Rollbar diagnostics. Follow the [title-in-URL implementation](./title-in-document-url.md).
- [x] Show the current document title in authenticated editor and public-share browser tabs, update the tab immediately during an editor rename, normalize whitespace, retain an untitled fallback, and avoid exposing private titles to unauthorized metadata requests.
- [ ] Browser-check title-bearing editor URLs and browser tabs at desktop and 390 px, including manual and heading-inferred first titles, save-before-address behavior, live rename, refresh, import, revision restore, Back-button history, Unicode, punctuation-only and duplicate titles, stale and ID-only links, query/hash preservation, public shares, and view/comment/edit/full permissions.
- [x] Temporarily hide the shared `BETA` wordmark badge by commenting it out at the source, while retaining the markup for an easy future restoration.
- [x] Give signed-in users a consistent top-right profile image or initials menu with direct Settings and Log out actions.
- [x] Add a dashboard **Words** column that derives each document's word count from the shared editor schema without another database request, returns zero for blank or malformed content, and identifies spreadsheet rows as not applicable.
- [ ] Browser-check dashboard word counts for blank documents, formatted inline text, lists, tables, shared documents, large counts, and spreadsheet rows at desktop and 390 px.
- [x] Anchor the account menu below its profile trigger so the identity section stays on screen, the trigger does not show through behind the panel, and the menu width remains within narrow viewports.
- [ ] Browser-check the account menu placement at desktop and 390 px across dashboard, editor, wizard, spreadsheet, settings, feedback, and admin headers, including escape and outside-click dismissal.
- [x] Let document owners create, copy, open, and revoke unlisted read-only share links; public views expose the title, document body, and owner profile name while keeping email and other account details private.
- [x] Make public share links owner-aware without automatically redirecting: when a signed-in owner opens their own link, retain the recipient-equivalent public rendering, label it as a public-link preview shared by them, and provide **Open original** and **Manage sharing** actions. The behavior and acceptance criteria are in [the shared-link owner experience](./shared-link-owner-experience.md).
- [ ] Browser-check the owner-aware share page at desktop and 390 px: confirm the **Public link preview** label, **Shared by you** attribution, **Open original** and **Manage sharing** actions for a signed-in owner, unchanged copy for signed-out and non-owner viewers, exclusion from printed output, and that **Manage sharing** correctly opens the share panel via `?share=1`.
- [ ] Deploy and browser-check permission-bearing **Anyone with the link** sharing for authenticated users, including visible controls with click-time session checks, post-authentication return to the selected action, immediate revocation, access logging, and explicit safeguards for full access; implementation and acceptance criteria are in [the full-access link-sharing design](./full-access-link-sharing.md). As of 13 August 2026 the explicit full-access safeguards are implemented: an inline confirmation step before saving a **Full access** link permission, and an email to the document owner the first time a distinct signed-in account uses a full-access link (`sendLinkAccessNotificationEmail`). Deployment and browser verification of the full feature remain outstanding.
- [x] Clearly identify who shared a document on the public read-only view, with a non-identifying owner label for legacy accounts that have no profile name.
- [x] Let full-access users invite collaborators by email with view, comment, edit, or full access; enforce those permissions on document, comment, suggestion, deletion, public-link, and sharing-management operations.
- [x] List documents shared directly with the signed-in email address on the dashboard and identify the owner.
- [x] Show each document's last-accessed timestamp on the dashboard and record successful authenticated or public document opens without delaying the response.
- [x] Provide an immediate prefetched loading state when dashboard document links navigate to dynamic document routes.
- [x] Close document-deletion confirmation dialogs after the authenticated deletion action completes.
- [x] Give dashboard document-link clicks an immediate selected-row state while preserving partial prefetch semantics for access tracking.
- [x] Use the pointer cursor consistently for enabled buttons and button-role controls across the app.
- [x] Use the full available document-editor width for the header, action bar, notices, and writing canvas while retaining only modest responsive edge padding.
- [x] Freeze the document editor's identity/action row and formatting toolbar at the top of the viewport (`position: sticky`) while scrolling a document, with an opaque background so content does not show through underneath.
- [ ] Browser-check the frozen action bar at desktop and 390 px: confirm it stays pinned while scrolling a long document, formatting-toolbar dropdown menus still render above it, it stays hidden in print output, and there is no visual overlap with the comments sidebar or document outline panel.
- [x] Add a lightweight, Google Docs-tabs-inspired section navigator (`DocumentTabs`): a horizontal tab strip, pinned inside the frozen action bar, listing a document's top-level (Heading 1) sections and jumping to the selected one on click. This deliberately does not replicate real Google Docs tabs (independently editable sub-documents with their own comments/revisions); it reads the existing single content tree, so comments, revisions, sharing, AI editing, and export are unaffected. True independent tabs would need a new `DocumentTab` data model, a migration for existing documents, and tab-aware updates throughout autosave, comments, revisions, sharing, AI routes, and Word/PDF export; that was deliberately scoped out as a separate, much larger project.
- [ ] Browser-check the document-tabs section navigator at desktop and 390 px: confirm the strip is absent for documents with no Heading 1 sections, tabs truncate and scroll horizontally rather than wrapping, the active tab tracks the cursor's current section, clicking a tab scrolls to and focuses that section, and it stays hidden in print output.
- [x] Replace literal **Default** formatting labels in the action bar with descriptive choices for the Thido font, body size, and theme text color.
- [x] Reduce the always-visible formatting toolbar to frequent actions, retaining zoom, typography, colors, list variants, strikethrough, and block quotes in the conventional **View** and **Format** menus.
- [x] Let document editors choose persisted Narrow (20 mm), Standard (40 mm), or Wide (60 mm) side margins from **View → Side margins**, apply the preference to editing, shared and revision rendering, browser printing, and Word/PDF export, and retain Standard margins for older documents.
- [x] Browser-check the revised side-margin menu and live editor at desktop and 390 px: confirm exact 20/40/60 mm desktop spacing, responsive 5/10/15% narrow-screen spacing, autosave requests, no horizontal overflow, and no framework errors.
- [x] Confirm type checking, zero-warning lint, all 192 unit tests, and the optimized production build pass after increasing the document side-margin choices to 20 mm, 40 mm, and 60 mm.
- [ ] Browser-check the 20 mm, 40 mm, and 60 mm side-margin selections at desktop and 390 px, including autosave/reopen persistence, responsive visual changes, shared and revision views, print preview, and representative Word/PDF output.
- [x] Let users choose persisted disc, circle, or square markers for unordered lists across editing, sharing, and printing.
- [x] Keep explicit whole-document AI comment requests in the foreground with a visible working state while ordinary anchored comments continue in the background.
- [x] Provide a visible whole-document comment composer with explicit scope, full-document AI revisions, reviewable suggestions, and concurrency-safe auto-apply behavior.
- [x] Lock document editing and new comments while a whole-document AI action is active, reject competing work across tabs, and expire abandoned locks after ten minutes.
- [x] Let users expand a background comment response to see its real queued, processing, or failed state while it refreshes automatically.
- [x] Move resolved comment threads into a collapsible archive and retain the ability to reopen or delete them.
- [x] Let document viewers hide and restore the comments sidebar to reclaim document width, expose the state through an accessible toggle, support the Google Docs-style discussion shortcut `Ctrl/⌘ + Alt + Shift + A`, and automatically reopen the sidebar when starting a comment.
- [x] Keep the comments sidebar closed on initial document load when the document has no comment threads, while continuing to open it for existing comments and newly started comments.
- [ ] Deploy and browser-check additional user messages and contextual Thido responses inside open AI comment threads, including failure recovery and whole-document locking.
- [x] Add Auto as the default AI edit mode, use the structured prompt decision to apply clear edit instructions while keeping questions and ambiguous requests as proposals, and retain explicit always-propose and always-apply overrides.
- [x] Keep the AI model and edit-application preferences in Settings instead of duplicating them in each document editor.
- [x] Show a dismissible recent Thido-change notice with the resulting text and keep durable changed-from/changed-to details in the comment thread.
- [x] Let dashboard users sort document rows instantly by title and last-accessed time without a server round trip.
- [x] Let document owners create, rename, and delete persisted folders; filter the dashboard by folder, Unfiled, or Shared with me; move owned documents between folders; and return documents safely to Unfiled when a folder is deleted.
- [x] Add first-class owner-only spreadsheets with an autosaving sparse grid, revision-based stale-write protection, tabular paste, basic arithmetic and range formulas, row/column growth, and bounded server-side content validation.
- [x] Let signed-in users create spreadsheets from the dashboard or persistent creation controls, reopen them from the combined file dashboard, move them through the existing folder system, and delete them with spreadsheet-specific confirmation copy.
- [x] Browser-check spreadsheet creation, cell editing, formulas, tabular paste, row/column growth, autosave/reopen, dashboard identification, and the 390 px scroll boundary against the isolated local database with no framework overlay or page-level horizontal overflow.
- [ ] Add spreadsheet sharing/collaboration, revision history and recovery, and account-export coverage before treating spreadsheets as feature-equivalent to Thido documents.
- [ ] Add CSV/XLSX import and export, multiple sheets, rich cell formatting, charts, and broader formula semantics based on validated product demand.
- [ ] Apply the `20260809120000_add_document_folders` migration before deploying folder organization, then browser-check the authenticated dashboard at desktop and 390 px, including create, duplicate-name validation, rename, move, filtering, delete-to-Unfiled behavior, shared-document restrictions, and empty states.
- [x] Use an accessible trash icon for dashboard deletion while keeping the confirmation dialog tied to the selected document title.
- [x] Bind dashboard deletion to the clicked row's document ID in the server action instead of trusting a hidden form field.
- [x] Remove the default dashboard `READY` status column and show only non-ready document states inline with the title.
- [ ] Define and communicate which pasted rich-text structures are preserved; treat importing Word/Google Docs comments and tracked changes as a separate feature.
- [x] Implement the repository-backed Priority 0 foundations in the [Google Docs feature-gap analysis](./google-docs-feature-gap-analysis.md): bounded durable version history and restore, revision-based stale-write protection across user and AI changes, Word import/export, and server-generated PDF download.
- [x] Add a Google Docs-style **File → Open** dialog with searchable Thido documents, and keep sanitized Word and Markdown replacement imports together under **File** so Markdown becomes regular editable Thido content.
- [x] Browser-check **File → Open**, Markdown import (including replacement confirmation, sanitization, and heading-derived naming), the empty-comment default, and both root-opening preferences at desktop and 390 px against the isolated local database with no framework overlay or horizontal overflow.
- [x] Let users drag a local Word `.docx` or Markdown `.md` file onto a blank editable document, reuse the secured revision-aware import path, and keep replacement of nonblank documents behind the explicit **File** flow.
- [x] Replace the format-specific import actions with **Import document…** and extend the shared picker, drag-and-drop, API, signature validation, observability, and fidelity contract to `.txt`, legacy Word `.doc`, OpenDocument `.odt`, and Rich Text `.rtf`; keep macro-enabled files, templates, Pages, Google pointer files, and PDF outside the initial promise. Follow the [document import format recommendation](./document-import-format-recommendation.md).
- [x] Auto-dismiss ordinary successful document-import notices after four seconds and import-note notices after ten seconds across File-menu and drag-and-drop imports, while keeping loading and error states visible.
- [ ] Move untrusted `.doc`, `.odt`, and `.rtf` parsing from the bounded in-process implementation into a low-privilege isolated worker or sandbox before broad production use, retaining time, memory, decompression, and archive-entry limits.
- [ ] Browser-check **Import document…** and blank-document drag-and-drop with representative `.docx`, `.doc`, `.odt`, `.rtf`, `.md`, and `.txt` files at desktop and 390 px, including timed success and import-note dismissal, fidelity warnings, signature rejection, replacement confirmation, version recovery, and no browser/framework errors.
- [x] Confirm the broad document-import implementation passes signature/encoding/sanitization/conversion coverage, direct extraction of host-generated `.doc`, `.odt`, and `.rtf` samples, the full 172-test suite across 41 files, TypeScript, focused lint, and the Next.js production build.
- [x] Detect high-confidence tab-separated, Markdown, CSV, and aligned-column text on paste and ask whether to convert it to a semantic table or keep the original lines as text.
- [x] Browser-check the table-conversion prompt and Markdown file drop against the isolated local database at desktop and 390 px, including heading-derived naming, editable imported content, responsive dialogs, no horizontal overflow, and no browser or framework errors.
- [x] Use the Google Docs-inspired hierarchy in [the document action layout recommendation](./document-action-layout.md): identity and collaboration controls on the first row, implemented **File / Edit / View / Insert / Format / Tools** menus below, and a compact icon formatting toolbar without standalone **Download**, **More**, or literal list buttons.
- [x] Label the existing task-list formatting control explicitly as **Checkbox list** so the checkbox bullet option is discoverable without relying on its icon.
- [x] Match Google Docs list choices with eight built-in bullet markers, a safe custom-bullet path, and checklist variants with or without completed-item strikethrough; preserve them in shared rendering and compatible Word/PDF fallbacks.
- [x] Make Google Docs-style completion the checklist default: clicking a checkbox marks it complete and strikes its text, while explicitly saved no-strikethrough checklists retain that choice.
- [x] Add small accessible up/down arrow controls to the left of editable checklist boxes, reorder complete items within their current list, disable unavailable boundary moves, and keep the controls out of read-only and printed output.
- [x] Browser-check checklist reordering at desktop and 390 px: confirm compact controls beside each checkbox, accessible item-specific labels, live first/last disabled states, working up/down actions, autosave requests, read-only hiding, no horizontal overflow, and no framework errors.
- [x] Confirm type checking, zero-warning lint, all 194 unit tests, and the optimized production build pass after adding checklist-item arrow reordering.
- [x] Make the checklist up/down reorder arrows an opt-out Settings preference (`UserSettings.checklistMoveControls`, default on), and add a delete button that appears to the left of a checklist item, alongside the arrows, only once that item is checked; deleting the last remaining item in a list removes the empty list rather than leaving an invalid zero-item `taskList`.
- [ ] Browser-check the checklist arrows Settings toggle and the checked-item delete button at desktop and 390 px: confirm the setting persists and takes effect on next document load, the delete button is hidden until an item is checked, deletion of the last item removes the list cleanly, and both remain excluded from read-only and printed output.
- [x] Make **Tab** indent an empty checkbox item, insert a tab space after checkbox text, and keep **Shift+Tab** outdenting checkbox items without changing ordinary paragraphs.
- [x] Fix **Tab** so it indents a checklist item whenever the cursor sits at the very start of its text, not only when the item is completely empty; it previously checked whether the whole item's text was empty rather than the cursor position, so pressing Tab at the beginning of a non-empty checkbox inserted a literal tab character instead of nesting it. Tab still inserts a literal tab when the cursor is anywhere else in the item's text.
- [x] Fix **Tab** with a range selection spanning one or more checklist items: it previously fell through to the same "insert a literal tab" path used for a mid-text cursor, which replaced the entire selected range (potentially several items' text) with a single tab character. Any non-empty selection now indents every checklist item it touches instead, matching the single-cursor-at-start behavior above.
- [x] Remove em dashes from all shipped Thido copy, replace them with clearer sentence punctuation or separators, and enforce the rule with an application-source regression test while preserving the editor's intentional em-dash insertion and cleanup capabilities.
- [x] Add a compact, Polymarket-inspired **How it works** home-navigation control that opens Thido's own accessible three-step walkthrough.
- [x] Implement the initial every-route **New document** chooser with blank document, AI-assisted draft, and spreadsheet choices; this placement is superseded by the route-aware top-navigation requirement below.
- [x] Remove the bottom-corner launchers and consolidate **New document** and the succinct **Feedback** action into one top-right utility row across signed-in pages, including removal of the duplicate dashboard creation control. Follow the [persistent-action placement recommendation](./persistent-action-placement.md).
- [x] Open every **New document** choice in a new tab while preserving the current page, including same-origin protected POST launchers for blank documents and spreadsheets.
- [x] Browser-check from an authenticated local session that blank document, AI draft, and spreadsheet choices each open their expected destination in a second tab, preserve the original page, and render without a framework error overlay.
- [ ] Browser-check the revised authenticated action placement at desktop and 390 px across dashboard, new-document landing, wizard, document editor, spreadsheet editor, settings, feedback, and admin routes; confirm both actions stay at the top, every creation choice opens in a new tab, menus open downward, there are no duplicate controls or content overlays, escape and focus restoration still work, and there is no horizontal overflow.
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
- [x] Add a second Google Docs-inspired P0 bundle with Select all; 75/100/125/150% zoom; page breaks; underline; highlight; inline code; superscript; subscript; code blocks; four-way alignment; and paragraph indent/outdent.
- [x] Browser-check the second P0 bundle on desktop and at 390 px: verify full-document selection with restored editor focus, underline/highlight/subscript/code formatting, page-break insertion, alignment, indent/outdent, zoom, scrollable viewport-contained menus, and no browser errors or horizontal page overflow.
- [x] Preserve the compatible expanded formatting, alignment, indentation, and page-break structures in shared-schema HTML and Word/PDF export, with explicit PDF fallbacks documented for highlight and superscript/subscript.
- [x] Add the next authoring bundle: a collapsible heading outline with navigation; Heading 4–6; font family, font size, text color, and highlight-color controls; line and paragraph spacing; uppercase/lowercase/title case; and localized date/time insertion.
- [x] Fix explicit black text becoming invisible against a dark theme background: reject near-black/near-white text colors when parsing pasted HTML (`RichTextStyle.ts`, since Word/Google Docs paste routinely bakes in an explicit `color: #000000` even when the source author never chose one) so future pastes don't create the mark at all; and add a CSS safety net (`globals.css`, `:root[data-theme="dark"] .ProseMirror [style*="color: #161916"]` etc.) that forces known near-black/near-white color marks to the theme foreground color, fixing already-saved documents (including Thido's own fixed `#161916` "Black" swatch, which is nearly the same shade as the dark theme's background) without a data migration.
- [ ] Browser-check the black/white text-color fix: confirm a document with pre-existing black-colored text (from paste or the Black swatch) reads normally after switching to dark theme, pasting new Word/Google Docs content with default black text no longer creates an explicit color mark, and a deliberately chosen non-extreme color (e.g. red, blue) still applies and persists correctly in both themes.
- [x] Extend the document outline with active-heading state and remove/add-back controls that preserve heading formatting.
- [x] Preserve deeper headings, typography, text color, and paragraph spacing in shared-schema HTML and compatible Word/PDF export, while retaining the documented PDF and Word re-import fallbacks.
- [x] Browser-check the authoring bundle on desktop and at 390 px, including live outline updates/navigation, toolbar horizontal scrolling, viewport-contained menus, formatting and Heading 6 persistence after reopening, localized date/time insertion, capitalization focus restoration, and absence of browser errors or page overflow.
- [x] Add a long-document productivity bundle with insertable named bookmarks and outline navigation/link management; previous/next-heading navigation; duplicate, reorder, and adjacent-paragraph block actions; sentence/toggle case; and expanded document statistics.
- [x] Browser-check the long-document productivity bundle on desktop and at 390 px, including bookmark insert/copy/navigate/rename/delete with undo, persisted and public bookmark rendering, previous/next-heading shortcuts, duplicate/reorder/adjacent-paragraph actions, sentence/toggle case, responsive statistics, viewport-contained menus, and no framework overlay or horizontal overflow.
- [x] Add twenty more editor features as one productivity bundle: document start/end; previous/next paragraph and table navigation; current-block selection/deletion and adjacent-block merging; and ten mark-preserving cleanup actions for repeated spaces, tabs, zero-width characters, soft hyphens, non-breaking and Unicode spaces, quotes, dashes, and ellipses.
- [x] Browser-check the twenty-feature productivity bundle on desktop and at 390 px: verify menu availability follows the live editor selection; start/end and table navigation; block selection/merge/delete; whitespace, dash, and ellipsis cleanup; viewport-contained scrollable menus; and no browser or framework errors.
- [x] Add a first-class **Edit with Thido** action that targets selected text when present and otherwise targets the whole document, with discoverable add/remove/rewrite examples, blank-document additions, intentional full-document clearing, revision-safe application, and preservation of editor-only document preferences through AI rewrites.
- [x] Move **Classic**, **Clean**, **Editorial**, **Warm**, and **Bold** out of individual documents and into persisted global user Settings, applying the selected style across navigation, settings, panels, and document editing while retaining legacy document appearance data for backward-compatible reads.
- [ ] Browser-check global application styles on representative authenticated pages at desktop and 390 px: verify live preview, save/reload persistence, light/dark compatibility, and no framework overlay or horizontal overflow.
- [x] Sub-organize the **Edit**, **View**, **Insert**, **Format**, **Tools**, and File-download menus into keyboard-accessible, responsive nested categories so the initial menu surfaces stay compact, with child menus opening beside their parent row and falling back within the viewport near an edge.
- [x] Browser-check nested editor menus at desktop and 390 px, including pointer expansion, sibling-branch replacement, multi-level side positioning, right/left arrow traversal, leaf selection, Escape behavior, and viewport containment without horizontal page overflow or browser errors.
- [ ] Browser-check all bullet presets, custom-bullet validation, default click-to-complete checklist strikethrough, empty-checkbox Tab nesting, typed-checkbox Tab spacing, Shift+Tab checklist outdenting, the optional no-strikethrough style, and outline active/remove/add-back behavior at desktop and 390 px, including persistence, public rendering, and representative Word/PDF output.
- [x] Rename the selection-level comment action and its supporting guidance to **Comment on selected text** so its scope is explicit.
- [x] Move the existing document-language control from **Tools** to a labeled **File → Language** dialog, retain spelling-suggestion controls under **Tools**, and explain that language selects browser spelling context rather than translating text.
- [x] Browser-check **File → Language** on desktop and at 390 px: verify the current-language label, explanatory dialog, persisted editor language, cleaned-up **Tools** menu, viewport fit, and absence of browser or framework errors.
- [x] Define and implement Thido's initial writing-language policy: persist an explicit document language and text direction, allow browser spelling suggestions to be disabled per document, and make clear that a dedicated grammar engine is not included.
- [x] Add stable internal heading links, copyable section URLs, hash navigation, insertable auto-refreshing tables of contents, and linked automatically numbered footnotes with backlinks.
- [x] Add quick insertion for em dashes, en dashes, ellipses, and non-breaking spaces through the **Insert** menu.
- [x] Preserve language/spelling/direction settings, heading anchors, tables of contents, and footnotes in autosaved editor JSON and public sharing; provide documented compatible Word/PDF fallbacks for contents and notes.
- [x] Browser-check the navigation/reference bundle at desktop and 390 px: verify persisted language, spellcheck, and RTL direction; stable heading IDs; copied/hash section navigation; live table-of-contents refresh; linked footnotes; shared rendering; viewport-contained menus; and no framework overlay or horizontal overflow.
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
- [x] Add data export and account deletion flows: a Settings **Your data** panel with a JSON export of the signed-in user's profile, billing identifiers, folders, documents, spreadsheets, authored comments, and feedback thread (`/api/account/export`), and a typed-confirmation account-deletion server action (`deleteAccount` in `src/app/account-data-actions.ts`) that best-effort cancels any active Stripe subscription, removes email-keyed `DocumentCollaborator` invitations for the deleted address, and relies on the existing cascade/`SetNull` foreign-key rules for everything else.
- [ ] Browser-check account data export and deletion: confirm the exported JSON download, the typed `DELETE` confirmation gate, sign-out and redirect after deletion, and that a subsequent sign-in attempt with the deleted account's credentials fails.
- [ ] Define retention rules for documents, comments, deleted accounts, auth tokens, and operational logs.
- [ ] Define a cleanup window for abandoned document placeholders that are no longer reusable.
- [ ] Verify cascade deletion behavior against the intended retention policy, including the new account-deletion path, against a real (non-production) database.

## Beta access and billing

- [x] Enforce a race-safe limit of 100 free beta accounts across password registration and Google sign-in, backfill existing accounts deterministically, show remaining places, and keep existing members able to sign in after the cap is reached.
- [x] Deploy the beta-access foundation to Vercel Production and verify the live `/register` page reports 93 of 100 places remaining for the seven seated accounts, with no card required.
- [x] After the first 100 automatic beta accounts, place password and verified-Google applicants on a waitlist and let an authenticated admin approve or reject the exact request with one click and an outcome email.
- [ ] Exercise password and Google waitlist entry, approval, rejection, duplicate submission, and approval-email delivery against production after the migration is deployed.
- [ ] Choose and approve paid-plan pricing, currency, billing interval, entitlements, and launch timing using [the paid-plan pricing suggestions](./paid-plan-pricing.md) before activating Stripe Checkout.
- [x] Prepare an accurate Stripe registration description for Thido as an AI-assisted document productivity SaaS in [the Stripe business description](./stripe-business-description.md).
- [x] Implement authenticated Stripe subscription Checkout, signed webhook processing, idempotent subscription-state persistence, failure reporting, and Customer Portal access using the Vercel Marketplace integration; keep Checkout hidden until a Price is configured.
- [ ] Claim and activate the currently sandbox-only Stripe account before accepting live payments. Use the intended Stripe owner account (its login email may differ from Vercel's), verify the business/legal entity and team access during the claim, and confirm the resource remains connected to the intended Vercel project environments afterward. Follow [the Vercel and Stripe email note](./vercel-stripe-different-email.md).
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

- [x] Add structured document-import outcome logs with request IDs, file kind, response status, and safe failure reasons for validation, rate-limit, conflict, lock, and conversion failures so File-picker errors can be traced without recording filenames or document contents; show the matching request reference in the editor and omit raw exception messages from runtime logs.

- [x] Remove the anonymous `/` redirect, deduplicate page/layout session reads, keep public routes off the auth proxy, server-render the usable empty prompt without breaking saved-draft restoration, and load browser Rollbar only when an error is reported; verify the optimized local production root returns `200 OK` with the form in its first HTML response and no browser or server errors.
- [ ] Finish the prioritized landing-performance work in [the measured load-speed report](./landing-page-load-speed.md) by separating the public shell from authenticated cookie/session layout work and splitting the initial prompt bundle so the public response can be cached and less JavaScript is required.
- [ ] Deploy the landing optimization, repeat clean-browser and throttled mobile baselines from at least two regions, and verify the public root meets or beats the **1.1 s clean-session median FCP** established in [the Google Docs comparison](./landing-speed-google-docs-comparison.md), while retaining Thido's substantially smaller transfer size.
- [ ] Add Vercel Speed Insights and establish route-level real-user p75 budgets of TTFB under 0.8 s, FCP under 1.8 s, LCP under 2.5 s, INP under 200 ms, and CLS under 0.1 before making a production landing-speed claim.
- [ ] Validate the assumptions in [Can the current version of Thido support 100 users?](./can-thido-support-100-users.md) with an isolated staging load test at 10, 25, 50, and 100 concurrent virtual users before making a concurrent-capacity claim.
- [x] Add automated unit tests for authentication input, password hashing, token helpers, rate limiting, and API auth responses.
- [x] Confirm the current unit suite passes: 187 tests across 46 files, including the rolling authentication-session policy; private/public auth-proxy route matching; document-import request references and privacy-safe structured outcome logs; spreadsheet bounds, coordinate conversion, tabular paste, arithmetic and range formulas, formula errors and cycles; folder-name normalization and case-insensitive keys; admin-detail route allowlisting and pagination validation; founder-inbox filter validation; Google-style bullet/checklist variants, default completed-item strikethrough, and context-aware Tab/Shift+Tab checklist behavior; em-dash-free application copy; normalized document browser-tab titles; dashboard word-count derivation; outline entry visibility commands; global application-style validation; legacy document appearance and AI-rewrite preference preservation; heading-derived document titles; safe Markdown conversion; pasted-text table detection and conversion; supported drag-and-drop document file types; viewport-aware side-menu positioning; stable heading and bookmark anchors; table-of-contents and footnote schema round trips; advanced editor typography/spacing/deeper-heading schema round trips and capitalization; editor text search/statistics; expanded block/navigation/cleanup commands; reviewed beta-seat allocation; UTC-backed reusable placeholders with localized title display; private-image public-share URL coverage; safe links; persisted bullet/checklist/table structures; revision coalescing; import sanitization; Word/PDF generation; link-derived authorization; and AI comment conversation ordering.
- [x] Confirm type checking, lint, Prisma validation, and the production build pass after the document-opening, Markdown-import, title-inference, comment-default, root-opening-preference, table-conversion, blank-document drag-and-drop, and side-opening nested-menu implementation.
- [x] Confirm type checking, lint, Prisma validation, all 146 unit tests, and the production build pass after the first-class spreadsheet implementation.
- [x] Confirm type checking, lint, Prisma validation, all 161 unit tests, and the optimized production build pass after the landing critical-path implementation.
- [x] Browser-check that authenticated `/` opens an empty reusable Thido document under the default preference, opens a meaningful recent document after selecting **Open my most recent document**, and returns to blank-document behavior after switching back; also verify the closed-by-default **New document** chooser exposes blank document, AI draft, and spreadsheet choices only after activation, stays within a 390 px viewport, closes on navigation or Escape, and the feature-suggestion launcher/page use the revised inviting copy without browser or framework errors.
- [x] Confirm type checking, lint, Prisma validation, all 161 unit tests, and the production build pass after the default-blank/optional-most-recent root preference, creation chooser, and feature-suggestion-copy implementation.
- [x] Confirm type checking, lint, Prisma validation, all 162 unit tests, the optimized production build, and desktop/390 px browser verification pass after the full-width editor, descriptive formatting labels, localized generated-title display, and in-place feature-suggestion drawer implementation.
- [x] Confirm lint, Prisma validation, all 162 unit tests, the optimized production build, and desktop/390 px browser verification pass after moving Markdown import into **File** and reducing the persistent formatting toolbar.
- [x] Browser-check an oversized Markdown import and confirm the editor's request reference matches the structured `413` runtime log with `file_too_large_or_empty`, without logging the filename or file contents.
- [x] Confirm type checking, lint, Prisma validation, all 166 unit tests, and the optimized production build pass after adding privacy-safe document-import outcome logging and user-visible request references.
- [x] Confirm type checking, zero-warning lint, all 192 unit tests, the optimized production build, and authenticated browser verification pass after making every **New document** choice open in a new tab.
- [x] Apply all nineteen migrations to an isolated temporary PostgreSQL instance and browser-check visible full-access link controls, click-time authentication with action return, full editor access, link-access activity, immediate revocation, and an additional user/AI message pair in an existing whole-document comment thread.
- [x] Browser-check the rendered connected-accounts Settings panel, empty admin approval waitlist, and editor image insertion control with no framework overlay or browser errors.
- [x] Deploy the connected-accounts, private document-photo, post-cap waitlist, verified auth sender, and analytics-status changes to Vercel Production (`dpl_6tYbWWaY4rT5FdFEBrkyGRQRjjHd`) and smoke-check the live login and registration pages without browser errors.
- [x] Confirm type checking, lint, Prisma validation, and the production build pass after the founder-feedback implementation.
- [x] Confirm type checking, lint, Prisma validation, and the production build pass after the verified-Google-email account-linking fix.
- [x] Prevent the founder-feedback POST runtime crash by keeping non-function state out of the `"use server"` action module and scanning every server-action module for invalid runtime exports in the unit suite.
- [x] Fix new-user Google OAuth registration by casting the PostgreSQL advisory-lock result to a Prisma-supported type, verify it against PostgreSQL, and retain a regression assertion for the lock query.
- [x] Confirm type checking, zero-warning lint, all 206 unit tests, and the optimized production build pass after adding AI credit allowance enforcement, owner-aware share links, full-access link-sharing safeguards, account data export/deletion, and account security-notification emails and sign-out-all-devices. `prisma generate` was run for the schema change; no `prisma migrate`/`db push`/`migrate status` command was run in this session because the effective local `DATABASE_URL` resolves to the production `neondb` database rather than an isolated instance.
- [ ] Browser-check the Settings **Security** (sign out of all devices) and **Your data** (export, typed-confirmation delete) panels, the **Plan and billing** AI usage meter, and the **Full access** link-permission confirmation step in Share, at desktop and 390 px, including error and pending states and no framework overlay or horizontal overflow.
- [ ] Exercise the AI monthly allowance in practice: confirm document generation, follow-up questions, and comment AI responses are blocked with a clear in-product message once the Free or Pro allowance is reached, that usage resets at the start of the next UTC month, and that the Settings usage meter matches actual consumption.
- [x] Confirm type checking, zero-warning lint, all 212 unit tests, and the optimized production build pass after adding the checklist arrows Settings toggle, the checked-item checklist delete button, the frozen document editor action bar, and the lightweight document-tabs section navigator. `prisma generate` was run for the schema change; no `prisma migrate`/`db push`/`migrate status` command was run in this session for the same production-`DATABASE_URL` reason noted above.
- [x] Confirm type checking, zero-warning lint, all 213 unit tests, and the optimized production build pass after fixing the checklist Tab-to-indent cursor-position bug and the near-black/near-white text-color legibility fix.
- [x] Confirm type checking, zero-warning lint, all 214 unit tests, and the optimized production build pass after fixing checklist Tab-to-indent for range selections spanning multiple items.
- [ ] Add a normal CI workflow that runs `npm ci`, `npm test`, `npm run lint`, and `npm run build` for pull requests and `main`.
- [ ] Add database integration tests for issuing and consuming verification and reset tokens transactionally.
- [ ] Add browser tests for registration, email verification, password reset, Google login, rolling session renewal, sign-out, stale sessions, and admin authorization.
- [ ] Add browser tests for pasted rich text, autosave, comment anchoring, AI suggestion accept/reject, concurrent edits, and orphaned comments.
- [ ] Add browser tests for creating, proposing, accepting, rejecting, and auto-applying whole-document comments, including cross-tab edit and comment locking.
- [ ] Add browser tests for creating, opening anonymously, and revoking read-only document share links, plus inviting by email and enforcing every collaborator permission level.
- [ ] Add automated billing tests for offer gating, authenticated Checkout and duplicate-subscription prevention, webhook signature rejection and idempotency, subscription-state transitions, and Customer Portal authorization; current status is summarized in [the paid-plan implementation status](./paid-plan-implementation-status.md).
- [ ] Create a separate test database and ensure tests can never target production credentials.
- [ ] Add accessibility checks for authentication, editor, settings, and admin pages.
- [ ] Define a release smoke-test checklist for production deployments.

## Monitoring and operations

- [x] Add Vercel Web Analytics page tracking.
- [x] Add the Reddit Ads pixel for the beta-launch post: `src/components/RedditPixel.tsx` loads Reddit's base snippet via `next/script` (pixel ID `a2_jjirkvc8nv8u` hardcoded) and fires `PageVisit`, mounted from `src/app/layout.tsx`. Gated on `NODE_ENV === "production"` so it never fires from local/dev traffic. Mounting it in the root layout also covers Reddit's "add to every page" step, since every route renders through it.
- [x] Add Reddit pixel advanced matching (match keys): `RootLayout` passes the signed-in user's `email` and `id` (as `externalId`) into `RedditPixel`, which JSON-encodes them into the `rdt('init', ...)` call when present and omits them for signed-out visitors. Skipped `phoneNumber`, `idfa`, and `aaid` — Thido doesn't collect a phone number and has no mobile app, so those fields have no source.
- [ ] Deploy and confirm real `PageVisit` events (and matched events once signed-in users visit) land in Reddit's Events Manager against the live domain.
- [x] Add an admin analytics summary integration.
- [x] Make every application-total card open its logical admin-only view: paginated metadata for users, beta seats, documents, comments, pending suggestions, and waitlist requests, plus the due-only founder inbox. Exclude document bodies, comment text, credentials, tokens, and proposal text from these operational tables.
- [x] Browser-check every admin-total destination against the local database and verify the admin grid plus scroll-contained detail navigation and tables at 390 px without page overflow or a framework error overlay.
- [ ] Continue the [admin page usefulness recommendations](./admin-page-usefulness-recommendations.md) with the unified action queue, search and deeper account drill-down, and an admin audit log.
- [x] Accept the Rollbar Marketplace terms in Vercel, install `rollbar/error-tracking` on the `thido-docpal` project, connect it to production, preview, and development, and pull the generated client and server tokens.
- [x] Verify the Rollbar server token and connected project accept a content-free development occurrence.
- [x] Verify through the Vercel project API that production Web Analytics is enabled and has received data.
- [ ] Configure `VERCEL_TOKEN`, `VERCEL_PROJECT_ID`, and `VERCEL_TEAM_ID` when required for the admin analytics view.
- [ ] Verify `/admin` shows real production analytics and system configuration status.
- [ ] Verify analytics, request logs, and error tracking record `/share/[token]` as a route pattern rather than storing bearer-token values; exclude or redact shared-document paths where necessary.
- [ ] Add content-free funnel events for guest outline start, authentication checkpoint, successful login return, and document claim.
- [x] Add privacy-conscious Rollbar browser and server error tracking, Next.js error boundaries, framework request-error capture, and explicit reporting for handled AI and email failures. Audited coverage on 18 August 2026: thrown server-side errors are caught automatically via the `onRequestError` instrumentation hook (`src/instrumentation.ts`), and all but one of the manually-constructed `500` responses already called `reportServerError`; fixed the remaining gap in `src/app/api/documents/[id]/share/route.ts`, where a failed share-link creation returned `500` without reporting it. See [docs/500-error-alerting.md](./500-error-alerting.md).
- [ ] Add structured server logging with request correlation IDs and secret redaction.
- [x] Configure alerts for elevated 5xx responses, function timeouts, email failures, database failures, and AI-provider failures. Created via the Rollbar Notifications API (`POST /api/1/notifications/email/rules`) on 18 August 2026 using a project-scoped write access token: an `occurrence` trigger (every occurrence, not just new/reactivated) filtered to `environment = production`, emailing `osatog1@gmail.com` (rule id `8115270`, confirmed persisted via `GET /api/1/notifications/email/rules`). Details in [docs/500-error-alerting.md](./500-error-alerting.md).
- [x] Extend `reportServerError` coverage beyond thrown/caught exceptions to every routine 4xx response (400/401/402/403/404/409/422/429) returned by API routes, including the shared `unauthorizedResponse`/`forbiddenResponse`/`aiAllowanceExceededResponse` helpers in `src/lib/apiResponses.ts` (now `async`; ~35 call sites updated to `await`). Requested explicitly on 18 August 2026 ("alert on every error, period") after confirming the earlier claim that routine 4xx never reach Rollbar; this makes that no longer true by design, so the `occurrence` rule above now fires on expected client errors too (bad logins, stale links, validation failures), not only unexpected server exceptions. Deliberately noisy-by-default, accepted so the alert rule can be narrowed after observing real volume — see the follow-up below.
- [ ] Configure production-only Rollbar rules for new errors, reactivated errors, and repeated failures, then verify email delivery with a controlled deployed error. The blanket `occurrence` rule above supersedes the need for separate new/reactivated rules for now; still need to (a) verify actual email delivery by deliberately triggering a production error, and (b) revisit narrowing the rule (e.g. to new/reactivated errors, elevated 5xx rates, or repeated failures) once the 4xx-reporting expansion above has run for a few days and the real inbox volume is known — `unauthorizedResponse()` in particular is likely to dominate volume, since it fires on every signed-out/expired-session request to a protected API route.
- [ ] Write incident-response and rollback instructions.
- [ ] Verify Vercel deployment rollback and Neon restore procedures.

## Security and dependency management

- [x] Keep current Next.js and React versions above the critical patched minimums recorded in project guidance.
- [ ] Upgrade Next.js from 16.2.10 to a patched 16.2.12 or newer compatible release and verify the current `sharp` and `postcss` advisories are resolved.
- [ ] Upgrade `next-auth` and `@auth/prisma-adapter` to releases containing the July 2026 Auth.js authorization, token-validation, email-normalization, and OAuth-cookie fixes, then rerun the authentication test matrix.
- [ ] Add Dependabot or Renovate for dependency update pull requests.
- [ ] Audit the nine vulnerabilities currently reported by `npm audit` (seven high and two critical), identify which are production-reachable, and upgrade affected dependencies without using a blind force-fix.
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
- [ ] Define and implement the employee and administrator access model for document content before making any claim that Thido personnel cannot read documents. Include default-deny production access, short-lived approved access, a recorded business justification, two-person approval for content reads, immutable audit logs, content redaction from logs and error reports, and a documented decision between provider-managed encryption and client-side customer-controlled encryption. Follow [the Google employee-access comparison](./how-google-limits-employee-access-to-files.md).
- [x] State how documents, prompts, account data, analytics, and AI-provider processing are handled.
- [x] Disclose Stripe-hosted billing, the billing identifiers Thido stores, and that Thido does not store full card numbers.
- [x] Enrich the first-time document-start page with a returning-user header action, a dropdown of more than ten document starters that replace the current outline, guest-flow reassurance, and a concise explanation of what happens after submission.
- [x] Default first-time visitors to light mode while retaining an explicit light or dark preference across visits.
- [x] Preserve common Google Docs formatting when pasted into the editor, including headings, font families and sizes, text colors, highlighting, emphasis, alignment, paragraph spacing, bullet and numbered lists, and rich tables.
- [x] Preserve Google Docs checkbox lists as editable Thido checkbox lists, including nested checklist items, instead of degrading them to ordinary bullets.
- [ ] Make images pasted as part of a Google Docs selection durable by uploading them into Thido-owned document storage instead of relying on temporary external image URLs.
- [ ] Browser-check representative Google Docs clipboard output in authenticated Chrome, Safari, Firefox, and Edge sessions before treating cross-browser paste fidelity as fully production-verified.
- [x] Browser-check the top-right theme control on the anonymous landing page at desktop and 390 px: confirm it remains in header flow, does not overlap **How it works** or **Sign in**, creates no horizontal overflow or framework overlay, and switches the document theme.
- [ ] Browser-check the top-right theme control beside the account menu on authenticated document, spreadsheet, dashboard, settings, feedback, and admin layouts before treating the relocation as fully production-verified.
- [x] Make guided brief and follow-up fields optional, clearly identify that Thido can infer omitted details, and require only one initial piece of direction before generation.
- [x] Use a consistent wide responsive shell across full-page surfaces and require an accessible confirmation with a visible pending state before deleting documents.
- [ ] Have qualified counsel review the policies for Thido's intended markets before public launch.
- [ ] Add the operator's complete legal name, business address, and specific governing law once confirmed.
- [ ] Create and monitor `legal@thido.ai`, `privacy@thido.ai`, and `support@thido.ai`, or replace them in the policies with verified contact addresses.
- [ ] Provide a support contact for login, billing, privacy, and data-deletion requests.
- [x] Add the signed-in founder-feedback experience described in [the founder feedback plan](./founder-feedback.md): an inviting persistent **Want a feature? Suggest it here** launcher that opens the private conversation in-place without navigating away, private threads, an admin inbox, direct email links for founder replies, reply emails to users, safe optional page context, and no automatic document-content capture.
- [x] Make the admin **Founder replies due** metric open an inbox view filtered to conversations awaiting a founder reply, ordered by deadline, and revalidate the metric after new messages and replies.
- [ ] Browser-check the **Founder replies due** metric with both pending and empty states, including returning to the full founder inbox.
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
