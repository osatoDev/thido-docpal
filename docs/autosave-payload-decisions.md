# Autosave: responses, debounce, permission reads, and full-content uploads

Updated after the five-second autosave UI change. These changes are local and have not been deployed.

## 1. Why return the full content after each save?

**The editor does not need it.** In `saveDocumentUpdate` in [TiptapEditor.tsx](../src/components/editor/TiptapEditor.tsx), a successful save only reads `document.revision` and `document.title`. The editor already has the content it submitted.

The save route previously returned the entire Prisma document result because that object was readily available. That was an implementation choice, not a requirement of autosave.

Changed the PATCH response to:

```ts
return NextResponse.json({
  document: { id: document.id, revision: document.revision, title: document.title },
});
```

Full content is still returned when explicitly loading a document. The save response change reduces Vercel-to-browser traffic. Reducing Neon-to-Vercel traffic requires changing database queries too, which this change also does below.

## 2. Five-second debounce and visible progress

The debounce is now **5,000 ms**. Each edit resets the countdown. The header shows “Autosaving in 5s” down to the request, with a progress bar measuring the pause before saving. During the request it shows “Saving…” with an indeterminate indicator; it does not invent a network-completion percentage. Only acknowledgement of the latest pending edits produces “Saved.”

“Save now” skips the countdown. A failed payload remains in memory and “Retry save” retries it; a later edit also carries failed fields forward, with newer values taking precedence. Comment creation and batch AI actions still explicitly save before proceeding.

While edits are waiting, saving, or failed, the UI asks the user to keep the page open. A browser beforeunload warning protects tab reload/close where supported, and a confirmation protects same-tab link navigation. These are warnings, not guaranteed background saves. Browser back/forward, programmatic navigation, device termination, and offline recovery still need additional handling. Pending edits are not stored durably, and continuous typing can keep postponing the save because there is no maximum-wait timer.

The countdown updates within the small status component rather than re-rendering the entire editor ten times per second. It uses a deadline so elapsed time is recalculated correctly after a delayed timer tick.

## 3. Why does the first read return content?

The shared `getDocumentForUser` helper used a Prisma query with `where` but no `select`:

```ts
prisma.document.findFirst({
  where: { id: documentId, AND: documentAccessWhere(userId, email, required) },
});
```

`where` decides which document the user may access. It does not limit returned fields. Prisma therefore returns all scalar document fields, including content.

For the save route's normal edit-permission check, only the document's existence and placeholder status are needed. That lookup now uses:

```ts
const editableDocument = await prisma.document.findFirst({
  where: {
    id,
    AND: documentAccessWhere(session.user.id, session.user.email, "EDIT"),
  },
  select: { id: true, isPlaceholder: true },
});
```

The same permission predicate remains in place. The fallback for a **comment-only user** still fetches content because the server must compare the proposed document with the existing one and reject changes beyond comment marks. Other callers of the shared helper are unchanged.

Also removed the unused `content: true` field from the transaction's current-document read. Its row lock and revision check remain intact. History writes now select only their resulting ID rather than returning a full snapshot that callers ignored.

For a normal successful editor save, these changes reduce approximately **four full-content database results to one**. The remaining full-content result comes from the document update and supplies the saved snapshot to revision history. For a 200 KB document, the content portion of that path falls from roughly 800 KB to 200 KB per save, excluding metadata and protocol overhead. This is a code-path estimate, not a measured reduction in the month's total bill, and does not include other operations such as polling.

## 4. Sending the whole document on each save

Your concern has a concrete basis: a one-character edit currently sends the complete document JSON from the browser to the server. The code calls `editor.getJSON()` and puts that full tree in the PATCH body. Calling an endpoint PATCH does not automatically make the payload incremental.

Full snapshots are straightforward to implement: the server stores the submitted state after checking its revision. But their cost grows with document length rather than edit size. They also cause repeated full-content writes to the current document and revision snapshot.

**This update still sends full snapshots.** It reduces save frequency and redundant responses, but it does not implement incremental saving.

For this Tiptap/ProseMirror editor, the next design to evaluate is sending a batch of editing operations—insert text, delete a range, change formatting—together with the revision those operations apply to. The server would:

1. Authenticate and authorize the operation.
2. Lock the document and verify the supplied base revision.
3. Apply and validate the operations using a compatible document schema, including tables, images, formatting, and comment marks.
4. Persist the resulting content and history, then acknowledge the new revision.
5. Recognize retried batches so a lost response cannot cause the same insertion to be applied twice.

That design can make small edits produce small uploads. It also requires retaining unacknowledged edits, recovering from disconnections, and handling stale revisions without silently dropping local work. AI changes, imports, and restores need explicit synchronization with queued operations. It is a separate persistence change, rather than replacing `getJSON()` with a smaller object.

Smaller uploads alone do **not** automatically eliminate Neon egress: if the server fetches the whole stored document to apply every operation batch, that is still a full-content database result. History snapshots can also continue to consume writes and storage. Upload size, database query results, and history storage need to be measured separately.

The user has explicitly prioritized efficiency over real-time collaborative merging. The next persistence design should use revision-checked incremental batches and explicit conflict/recovery behavior, preserving the current reject-stale-edits policy. Real-time merging is outside the current priority. Full-content uploads still remain; the five-second debounce and query reductions are the improvements implemented so far.

## Implementation status

Implemented locally: five-second debounce with countdown, honest save progress, manual flush/retry, unsaved-navigation warnings, and acknowledgement-aware status; metadata-only PATCH response, metadata-only edit authorization lookup, removal of the unused transaction content read, and ID-only revision-write results. No deployment or database migration was performed. Incremental uploads and the remaining durability improvements described above are outstanding.

Validation: TypeScript typecheck and targeted ESLint passed; all 242 unit tests passed. Ten Playwright setup/workflow tests passed against the isolated local database, covering the new autosave flow, the existing editing workflow, and AI-comment pre-saving. A targeted follow-up also passed for cancelling the browser reload warning and then retrying the unsaved payload. Agent-browser desktop and 390 px mobile checks showed the countdown and Save now control without horizontal overflow or browser errors.
