# How document autosave works

> Historical baseline before the local autosave changes: debounce is now 120 seconds with visible countdown/save progress, and redundant content results have been reduced. See [current changes and remaining full-content uploads](./autosave-payload-decisions.md). These changes have not been deployed.

Verified against the current code on 27 September 2026.

**Thido saves after you stop editing for 600 milliseconds. Each content save sends the entire document as JSON.** It does not send just the changed words, and it does not save on a fixed timer.

## From typing to a saved document

1. An editor change captures the full document using `editor.getJSON()`. Title edits also schedule saves; the editor can infer a title from content until a title is manually set.
2. The change is merged into an in-memory pending save, and the interface enters its saving state. Each further change restarts the 600 ms timer. For example, typing without a 600 ms pause keeps postponing the save; there is no maximum-wait timer in this path.
3. When the timer fires, the pending save enters a queue. Requests from that editor run one at a time, so an earlier request finishes before the next starts. New edits can accumulate while a request is running.
4. The browser sends `PATCH /api/documents/{id}` with the changed fields and its last known `baseRevision`. Content changes include the whole document JSON; a title-only save can omit content.
5. The server authenticates the user and checks document permissions. Inside a database transaction, it locks the document row, reads the current revision/content, rejects stale revisions or active comment-AI work, updates the document, increments its revision, and records a history snapshot.
6. After the transaction, content saves reconcile orphaned comment anchors. The server returns the saved document. The browser updates its known revision and title URL and enters its saved state.

Implementation: [editor scheduling and request queue](../src/components/editor/TiptapEditor.tsx), [save API](../src/app/api/documents/[id]/route.ts), and [permission checks](../src/lib/documentAuth.ts).

## Autosave versus version history

Every successful save updates the current document immediately and increments its revision counter. **The two-minute history window does not delay autosave.**

For history, if the latest snapshot is a user edit by the same person and was created less than two minutes ago, the server replaces that snapshot's content and revision. Otherwise, it creates a new snapshot. The window is measured from the snapshot's original creation time, not extended after every update. AI, import, and restore changes use their own revision sources.

This limits the number of history rows, but each save still writes a full snapshot. See [revision persistence](../src/lib/documentRevisions.ts).

## Conflicts, AI work, and failures

| Situation | Current behavior |
| --- | --- |
| Another tab or collaborator saved first | The server returns a revision conflict rather than overwriting the newer revision. The editor flags the conflict and stops further queued/scheduled saves; it provides a reload-latest flow. There is no automatic merge. |
| Comment AI is working on the document | Normal saving is blocked. When a save encounters the AI lock, the editor polls for completion every 1.25 seconds. |
| Adding a comment or starting batch AI actions | The editor explicitly saves the latest content first, including pending changes, and waits for success before continuing. |
| Network error or unsuccessful save response | The editor enters an error state. This save path does not automatically retry or restore the failed request to the pending-save buffer. A later content edit can schedule a new full-content save. |
| Leaving before the 600 ms timer fires | Component cleanup cancels the timer. This component has no unload flush or durable local draft recovery for that pending save, so those latest edits can be lost. |

There is also a status edge case: completion of an older queued request can set the state to saved even while newer edits are still pending. The current status is updated per request rather than derived from whether all edits have been acknowledged.

## Why this affects Neon usage

For a typical successful owner save, the current code sends approximately four document-sized results **out of Neon**:

1. The permission helper fetches the full document.
2. The transaction fetches current document content again.
3. The document update returns the full updated row.
4. The history write returns its full snapshot, even though the caller ignores that result.

For a 200 KB document, this is roughly 800 KB of database egress per save, before metadata and protocol overhead. The uploaded content is inbound traffic; the browser response is a separate Vercel network leg. Reducing history row count alone does not remove this repeated transfer.

The first straightforward optimization is to return only an ID from history writes, followed by reducing redundant content reads and making AI polling fetch status only. Autosave durability, retry handling, and accurate save status should also be addressed. See the [Neon usage investigation](./neon-network-transfer-audit.md) for measured figures and the limits of historical attribution.

This is an explanation of existing behavior; no application code was changed.
