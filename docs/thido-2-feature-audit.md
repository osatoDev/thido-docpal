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

The migration `20261107120000_thido_2_remove_document_features` drops the removed tables and columns and **deletes their data**. Back up production before deploying it.

Documents saved with comment highlights keep loading. The comment mark stays in the editor schema as a plain span, because Tiptap replaces content it cannot parse with an empty document.

## Version history

Each document keeps one version per UTC day: the last state saved that day. Older versions are thinned by age:

- Under 30 days old: one per day.
- From 30 days to 6 months: one per week (weeks start on Monday).
- Older than 6 months: one per month.

Versions from the current day are never pruned, so a restore or import can be undone until the day ends. Pruning runs inside the same transaction whenever a new version is written. A document edited every day keeps about 60 versions after one year and 84 after three. The monthly tier keeps growing by 12 a year, so the count passes 100 after about four and a half years of daily use. Logic and tests: `src/lib/documentRevisions.ts`.

## Kept

- The planner: day headers, Days outline, plain-language task entry, Review my day, automatic feedback.
- The editor, including the long-form writing tools (footnotes, bookmarks, custom bullets, word count, tabs, outline, table dialogs) and document import.
- Autosave, conflict recovery, version history and restore.
- Accounts, beta waitlist, billing and AI credits, settings, founder feedback, admin, legal pages.

## Still to do

1. **One continuous page per person** (decided 6 November 2026). Signing in should open the plan directly. That removes the dashboard, folders, the "New document" button, the `documentStartMode` setting, per-document URLs and the admin "created a document" email. It also needs a decision on existing users' documents: merge their days into the plan, keep the others as a read-only archive, or offer an export first.
2. **A way to try the planner before signing up.** The planner API needs an account, so the homepage now sends visitors to sign-up.
3. **Integrations listed as coming soon:** Telegram, Google Calendar and Microsoft Outlook.
4. **Phone reminders** (see `docs/ai-planner.md`).
5. **Customer quotes.** Add a testimonials section only with real quotes and permission to publish them.
