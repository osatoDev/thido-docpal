# Thido 2.0 feature audit

Thido is pivoting from an AI document companion to an AI day planner. This file records what the pivot removed, what stays, and what is still open. Status as of 6 November 2026 on the `ai-planner` branch.

## Removed

| Feature | What went |
| --- | --- |
| Brief wizard and AI first drafts | `/try`, `/documents/new`, `/documents/[id]/wizard`, `src/components/wizard`, follow-up and generate routes, `PromptAnswer`, "Draft with AI" |
| Guest drafts | `guestDraft.ts`, `claim-guest-draft`, the `draft-ready` sign-in notice, "Start without an account" on the login page |
| Document starters | `documentStarters.ts` |
| Comments, AI replies and suggested edits | Comment sidebar, composer, routes, `Comment` and `Suggestion` tables, the `aiCommentMode` setting, the document AI lock |
| Spreadsheets | Routes, editor, `Spreadsheet` table, "Spreadsheet" in the new-document menu |
| Sharing | Share links, collaborators, `/share/[token]`, share and link-access emails, `DocumentCollaborator` and `DocumentLinkAccess` tables. Documents are private to their owner. |
| Version-history retention notices | The 14-day notice email, "Keep all versions", `/documents/[id]/history`, the `document-history` cron, `DocumentHistoryRetention` |
| Export | Word and PDF download routes and menu items, `docx` and `pdfkit`. Browser print stays. |
| Application styles | The Classic/Clean/Editorial/Warm/Bold setting and its CSS |
| Reactivation nudge email | "Your document is still here". The activation nudge stays, rewritten for planning. |

Old links to `/try` redirect to `/register`, and links to `/documents/new` redirect to `/`.

The migration `20261107120000_thido_2_remove_document_features` drops the removed tables and columns and **deletes their data**. Run it with `npm run db:migrate:prod` right after the new code is live (the old code still reads those tables), and back up the database first. No legacy site is planned: the only outside users of the removed features were two people testing comments, and their documents carry over.

Documents saved with comment highlights keep loading. The comment mark stays in the editor schema as a plain span, because Tiptap replaces content it cannot parse with an empty document.

## Version history

Each document keeps one version per UTC day: the last state saved that day. Older versions are thinned by age:

- Under 30 days old: one per day.
- From 30 days to 6 months: one per week (weeks start on Monday).
- Older than 6 months: one per month.

Versions from the current day are never pruned, so a restore or import can be undone until the day ends. Pruning runs inside the same transaction whenever a new version is written. A document edited every day keeps about 60 versions after one year and 84 after three. The monthly tier keeps growing by 12 a year, so the count passes 100 after about four and a half years of daily use. Logic and tests: `src/lib/documentRevisions.ts`.

## One plan per person (done)

Signing in opens `/plan`, created on first visit with today's day and an empty checklist. The dashboard, folders, "New document", the document-title box on the plan, the start-mode setting and the admin "created a document" email are gone. Older documents are listed at `/documents` (account menu → Older documents) and stay editable. Migration `20261107140000_one_plan_per_person` adds `User.planDocumentId` and drops folders (names and assignments only; documents are kept).

## Kept

- The planner: day headers, Days outline, plain-language task entry, Review my day, automatic feedback.
- The editor, including the long-form writing tools (footnotes, bookmarks, custom bullets, word count, tabs, outline, table dialogs) and document import.
- Autosave, conflict recovery, version history and restore.
- Accounts, beta waitlist, billing and AI credits, settings, founder feedback, admin, legal pages.

## Still to do

1. **A way to try the planner before signing up.** The planner API needs an account, so the homepage now sends visitors to sign-up.
2. **Integrations listed as coming soon:** Telegram, Google Calendar and Microsoft Outlook.
3. **Phone reminders** (see `docs/ai-planner.md`).
4. **Customer quotes.** Add a testimonials section only with real quotes and permission to publish them.
