# Version history: ten at a time and a choice before cleanup

## What users see

Version history initially lists the **10 newest versions**. **Show more** appends the next 10 without replacing the entries already shown. The list contains metadata only; choosing a version fetches that version's content for preview. A failed preview offers Retry preview. Restore keeps the existing revision-conflict checks and creates a new version.

The owner can choose **Keep all versions** in the history dialog or at the authenticated page linked from a notification email. This disables automatic cleanup for that document, including future versions. Collaborators can use history according to their existing edit permissions but cannot change the owner's retention choice.

## Retention policy

When a document exceeds **100 saved snapshots**, a daily job prepares a warning for its owner. A verified owner email is required. The warning explains the planned cleanup, confirms that the current document and at least the latest 100 snapshots remain, and links to a page where the owner can keep everything.

The user selected a **14-day grace period**. The implementation gives the owner at least that long:

1. Claim a notice for the document and record the revision boundary covered by it. Concurrent job runs cannot claim the same document during the 15-minute claim lease.
2. Send the warning with a unique provider idempotency key. Missing email configuration, development previews, and failed sends cannot schedule deletion.
3. Store the provider's email ID, then check delivery on a subsequent scheduled run. Only delivered/opened/clicked status qualifies. Queued, merely sent, delayed, bounced, failed, suppressed, complained, or unknown/unavailable delivery does not qualify.
4. Start the full 14-day countdown when delivery is confirmed. The email gives an “on or after” date; the actual cleanup date can be later because delivery is checked daily and batches are bounded.
5. After the deadline, lock the document, recheck that the owner has not chosen to keep everything, and remove only the older snapshots covered by that notice. Recalculate the newest-100 boundary under the same lock before deleting anything.

The current document is never deleted by this process. A version created during the grace period is not covered by the earlier notice. Consequently, an actively edited document can temporarily retain more than 100 versions after a cleanup. A later notice and a new grace period cover a later batch. The limit concerns snapshot rows, not the document's numeric revision counter, which can have gaps because autosaves coalesce.

Choosing Keep all versions clears the pending cleanup and persists an opt-out. The keep action and cleanup both use the document's row lock, as saving/restoring do. Opening the email link only displays the authenticated page; it does not change any setting, so link-scanning software cannot make the choice. Once already deleted, old versions cannot be recovered through this feature.

## Warning email

Subject: **A choice about your document’s version history**

The message explains that drafts may be valuable, gives the earliest cleanup date, describes what stays safe, and offers **Review and keep my history**. It states that doing nothing allows permanent removal after the notice period and that keeping everything also covers future versions. The email contains the document title and review link, but no document body or snapshot content. User-controlled text is HTML-escaped.

Implementation: [email template and delivery check](../src/lib/email.ts), [retention rules](../src/lib/documentHistoryRetention.ts), [scheduled route](../src/app/api/cron/document-history/route.ts), and [owner choice page](../src/app/documents/[id]/history/page.tsx).

## API and database changes

- `GET /api/documents/:id/revisions` returns 10 metadata rows plus `nextCursor`. The database fetches an extra metadata row to determine whether another page exists.
- `GET /api/documents/:id/revisions?before=<revision>` loads the next metadata page. This removes the old hard stop at 100 browsable versions.
- `GET /api/documents/:id/revisions?revision=<revision>` returns one authorized snapshot for preview.
- `POST /api/documents/:id/revisions/retention` with `{ "keepAll": true }` persists the owner's choice. It rejects signed-out users and non-owners.
- `DocumentHistoryRetention` stores policy and notification state separately from `Document`, so warning/keep operations do not change the document's content modification timestamp.
- Migration: [20260928010000_document_history_retention](../prisma/migrations/20260928010000_document_history_retention/migration.sql). It creates a table/index and does not delete or modify existing history.
- The daily job is configured at **10:00 UTC** in [vercel.json](../vercel.json), authenticated with `CRON_SECRET`. It limits each phase to 25 records and stops starting additional work after approximately 45 seconds. It reports notice/deletion/delivery-pending/error counts without snapshot content.

The cron configuration follows [Vercel's authenticated cron guidance](https://vercel.com/docs/cron-jobs/manage-cron-jobs). Delivery verification uses [Resend's retrieve-email status](https://resend.com/docs/api-reference/emails/retrieve-email); delivery to a mail server is not proof that a person read the email.

## Verification and rollout

Completed locally: TypeScript and targeted ESLint passed; 273 unit tests, two isolated PostgreSQL integration tests, and four Playwright setup/workflow checks passed.

- Migration applied to the isolated local test database; Prisma client regenerated.
- Unit tests for grace timing, missing delivery, failed sends, repeated claims, opt-out, owner authorization, deletion boundaries, and email content/escaping.
- PostgreSQL integration tests verify no deletion before delivery plus 14 days, preservation of newly created snapshots, and permanent opt-out.
- Browser tests verify 10-row metadata pages, Show more, browsing past the previous 100-row cap, individual previews, restoration, and authenticated owner choices.
- Desktop and 390 px mobile inspection of the history dialog and owner-choice flow.

Before production activation:

1. Apply the migration before deploying code that queries the new table.
2. Verify `CRON_SECRET`, the production origin (`AUTH_URL`/`NEXTAUTH_URL`), `AUTH_EMAIL_FROM`, and `RESEND_API_KEY`. The Resend key must support both sending and retrieving delivery status. A send-only key causes delivery checks to fail safely and prevents cleanup.
3. Verify actual warning delivery and the sign-in/keep-history flow with a controlled production test document. No live notification was sent during this implementation.
4. Deploy and confirm the scheduled job is active; inspect aggregate job results and error monitoring. Persistent delivery failures retain history and require operational investigation.
5. Monitor batch backlog as usage grows. The retention worker deliberately bounds each run rather than processing the entire account without limits.

No production migration, deployment, email send, or deletion was performed in this turn. AI-status polling is unchanged; its [separate code explanation](./ai-status-polling-explained.md) covers that request.
