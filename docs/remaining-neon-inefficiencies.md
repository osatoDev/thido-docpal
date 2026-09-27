# Remaining Neon inefficiencies

> Update: version history now loads ten metadata entries and one selected preview, with notice-based retention implemented locally. See [the implementation and rollout status](./version-history-pagination-and-retention.md). Other findings below describe the audit baseline.

**Yes. The biggest remaining opportunities are version-history loading, full-content AI polling, and dashboard word counts.** These can be improved without implementing real-time collaborative merging.

This is a source-code audit of the current working tree, including our local autosave improvements. Those improvements have not been deployed during this session, so their production savings are not yet verified. No fresh production traffic measurements were collected for this review; rankings below describe potential impact, not percentages of the earlier 4 GB alert.

## Highest-value remaining changes

| Priority | Source | Current behavior | More efficient approach |
| --- | --- | --- | --- |
| High | **Version history** | Opening history selects the full content of up to **100 revisions**, plus an authorization lookup that also fetches current content. The browser displays only one selected revision at a time. | Load a paginated metadata list, then fetch only the selected revision's content. Keep restore permission/revision checks. |
| High | **AI-status polling** | Each active polling loop waits **1.25 seconds** between requests. The comments endpoint returns document content, all top-level comments, replies, and suggestions every time, even while the AI job is still running. | Poll lightweight job status and revision; fetch the full document/comments once when needed. Add backoff, pause hidden tabs, and ensure only one loop runs per document. |
| High as libraries grow | **Dashboard word counts** | The dashboard loads every accessible non-placeholder document, including content, without pagination. It calculates `countDocumentWords(document.content)` in application memory for each row. | Persist a word-count field during content-changing operations, backfill it once, and query only dashboard metadata with pagination. |
| Medium; frequent | **Remaining autosave content result** | The document update still returns the whole row from Neon so application code can pass its content to the history writer. This is the one large result remaining on the normal editor-save path after our reductions. | For content saves, reuse the validated content being persisted and select only the metadata needed from the update; alternatively copy the saved snapshot into history inside PostgreSQL. Handle title-only saves and existing-content snapshots explicitly. |
| Medium; easy to narrow | **Other permission-only reads** | The shared `getDocumentForUser` helper still returns full content. Examples include listing collaborators and authorizing image uploads. Only the autosave edit-permission lookup was narrowed. | Use operation-specific field selections or a separate metadata-only authorization helper. Preserve content reads for operations that actually inspect it, including comment-only editing validation. |
| Medium as sheets grow | **Spreadsheet autosave** | Spreadsheets still use a **600 ms debounce**, send the full grid, and select/return content from the database update. Their browser save handler only reads the returned revision. | Apply the appropriate debounce/status behavior separately and return revision metadata only. Later consider revision-checked cell changes. The document's new five-second setting does not apply to spreadsheets. |

Examples show why these matter, using **200 KB** of JSON content as an illustration:

- Opening 100 similarly sized historical versions can fetch roughly **20 MB** of content in one request, before metadata and protocol overhead.
- One AI polling loop can fetch roughly **9.6 MB per minute** at 48 responses/minute. Actual frequency is lower when request latency is included; polling only runs during the relevant AI-waiting flow.
- A dashboard containing 50 such accessible documents can fetch roughly **10 MB** each time that dashboard query runs.
- The remaining content result on autosave is roughly **200 KB per successful save**, even though the browser now receives metadata only.

These are illustrative calculations, not measured usage totals. The actual impact depends on document sizes and how often each feature is used.

Code evidence:

- [Version-history query](../src/app/api/documents/[id]/revisions/route.ts) and [history viewer](../src/components/documents/VersionHistoryControl.tsx).
- [AI polling loop](../src/components/editor/TiptapEditor.tsx) and [comments response](../src/app/api/documents/[id]/comments/route.ts). The loop has no visibility check or shared in-flight guard and can be invoked from several paths; overlapping loops are a risk, not a measured incident.
- [Dashboard query and word-count calculation](../src/app/dashboard/page.tsx).
- [Autosave update and history call](../src/app/api/documents/[id]/route.ts).
- [Shared authorization helper](../src/lib/documentAuth.ts), [collaborator list](../src/app/api/documents/[id]/collaborators/route.ts), and [image upload authorization](../src/app/api/documents/[id]/images/route.ts).
- [Spreadsheet timer and response consumer](../src/components/spreadsheets/SpreadsheetEditor.tsx) and [spreadsheet update result](../src/app/api/spreadsheets/[id]/route.ts).

## Additional overhead and storage growth

**Full history writes still happen on every save.** [Revision persistence](../src/lib/documentRevisions.ts) coalesces user edits within a two-minute window, but it updates that snapshot's full content each time. It reduces row count, not write frequency. There is also no implemented retention policy. This affects database work, storage churn, and restore-history volume; it should not be mistaken for the outbound-transfer metric in the alert. A retention policy or less frequent history checkpoints needs a deliberate recovery/history decision rather than deleting versions as a performance shortcut.

**No-op saves are not explicitly eliminated.** The save handler increments the revision and records history after accepted requests without comparing whether the requested state actually changes. The longer debounce groups nearby edits but is not deduplication. Prefer detecting unchanged acknowledged content on the client or using a server-maintained digest; do not add a full-content database read solely to avoid a write.

**Several small queries run around each save.** Authentication validates the user/session version and settings; the handler locks the row, reads metadata, expires stale AI jobs, checks active jobs, and finds the latest history row. Content saves also run two comment-anchor reconciliation updates. These are mainly query/compute overhead rather than large outbound payloads. Optimize with measurements and preserve session revocation, authorization, locking, and comment correctness. An update matching zero rows still costs a query but does not necessarily rewrite data.

**Some status-only updates return unused full documents.** [Generation status changes](../src/app/api/documents/[id]/generate/route.ts) use `document.update()` without a `select`, even where the result is ignored. These can select only an ID. Their transfer cost depends on whether the document already has substantial content.

**Feedback refreshes reload conversation history.** [FeedbackConversation](../src/components/feedback/FeedbackConversation.tsx) refreshes every 15 seconds while visible; the [feedback endpoint](../src/app/api/feedback/route.ts) selects all messages. This is probably lower priority at current scale, but cursor-based “messages since…” fetching will age better. Unlike the AI polling loop, this path already checks tab visibility.

## What is already improved or should remain

- Document autosave now waits five seconds, and the ordinary edit-permission and transaction metadata reads no longer request content. The browser response is metadata-only, and revision writes return only an ID.
- The editor needs full content when a document is opened. That is purposeful transfer. Its accessible-document loader already uses React `cache` for request-level reuse; this is not a persistent cross-request content cache.
- Document access timestamps use a SQL update without returning content. This is a small write, not another document download.
- The application already reuses a Prisma client within its module/process lifecycle; there is no evidence here of a new client being constructed for every query.
- Do not remove authorization checks or cache private document responses across users to save traffic.

## Recommended order

First deploy and measure the existing autosave changes. Then make history previews load on demand and make AI polling status-only; both remove large repeated transfers without changing the editing model. Next persist dashboard word counts and finish metadata-only query selections, including spreadsheet save responses. After that, evaluate incremental document/cell uploads with explicit revision conflicts and retry recovery.

Full-content browser uploads are still inefficient for small edits, but inbound upload volume is a different network direction from the Neon outbound allowance. Incremental uploads should follow the efficiency-first direction without introducing real-time merging, and their server implementation must also avoid unnecessary full-content results from Neon.

No application code, database configuration, or stored data was changed during this review. Follow-up work is tracked in [the production checklist](./production-todo.md).
