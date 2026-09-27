# Why autosave reads document content twice before saving

> Historical baseline before the local autosave changes: debounce is now 5 seconds with visible countdown/save progress, and redundant content results have been reduced. See [current changes and remaining full-content uploads](./autosave-payload-decisions.md). These changes have not been deployed.

The quoted statement describes **two separate database requests during one save**. Both bring the existing document content from Neon into the application server running on Vercel. The 600 ms timer controls how often the browser starts this save process.

## 1. The first read checks permission—and also returns content

In `src/app/api/documents/[id]/route.ts:73`, the save handler calls:

```ts
const editableDocument = await getDocumentForUser(
  id,
  session.user.id,
  session.user.email,
  "EDIT",
);
```

This asks: “Find this document if this user is allowed to edit it.” The helper in `src/lib/documentAuth.ts:80` executes:

```ts
return prisma.document.findFirst({
  where: {
    id: documentId,
    AND: documentAccessWhere(userId, email, required),
  },
});
```

The distinction is between **which row to find** and **which fields to return**:

- `where` restricts the result to the document the user may access.
- There is no `select`, so Prisma returns all scalar fields on the `Document` model, including its large `content` JSON field.

Thus, although this helper checks authorization, its result is the document itself, not just `true` or `false`. “Entire document” here means the document row, including content and metadata; it does not automatically include related comments, images, or version-history rows.

For a user with edit permission, the subsequent `editableDocument ?? ...` expression reuses that result. It does **not** run the fallback COMMENT permission lookup. The second content read described below is a different call inside the transaction.

## 2. The second read explicitly requests content again

In `src/app/api/documents/[id]/route.ts:173`, the handler starts a transaction and locks the document row. It then runs:

```ts
const currentDocument = await transaction.document.findUnique({
  where: { id },
  select: {
    id: true,
    title: true,
    titleManuallySet: true,
    content: true,
    revision: true,
  },
});
```

Here there **is** a `select`, but `content: true` explicitly requests the whole content field again. This is another query and another result sent from Neon to Vercel; Prisma does not reuse the earlier JavaScript object's content for this query.

Reading the revision after taking the lock serves a purpose: another save could have happened since the first lookup. The code compares this current revision against the browser's `baseRevision` to prevent overwriting someone else's changes.

However, **this transaction's `currentDocument.content` is never used in the current handler**. The subsequent code uses `currentDocument.revision` for conflict detection and `currentDocument.titleManuallySet` for title behavior. The updated document returned by the later write is what supplies content for revision history. Therefore, selecting content in this second read adds transfer without serving those checks.

The first lookup is more nuanced: the comment-only permission path uses existing content to verify that a change affects comment marks rather than document text. Changing the shared helper globally to omit content would require accounting for that path and other callers.

## 3. What “two document-sized results” means

For an existing document whose content is approximately 200 KB, a normal successful editor save does this before the update:

```text
Browser sends a save request to Vercel
                    |
                    v
Vercel asks Neon for an authorized document
Neon -> Vercel: existing content (~200 KB) + metadata
                    |
                    v
Vercel starts a transaction and locks the row
Vercel asks Neon for current revision, content, and title fields
Neon -> Vercel: existing content (~200 KB) + selected metadata
                    |
                    v
Vercel updates the document
```

That is approximately **400 KB outbound from Neon before the write**, even if the edit was only one character. It is repeated transfer of content, not two additional stored documents. Exact wire bytes depend on serialization and protocol overhead; the two reads could also see different content if another save happened between them.

The write and history operation currently return content too. Those are additional results covered in the [broader usage audit](./neon-network-transfer-audit.md); they are not included in the two reads explained here.

## 4. Where the 600 ms pause comes from

In `src/components/editor/TiptapEditor.tsx:403`, `scheduleSave` contains:

```ts
pendingSaveRef.current = { ...pendingSaveRef.current, ...next };
if (debounceRef.current) clearTimeout(debounceRef.current);
setSaveState("saving");
debounceRef.current = setTimeout(() => {
  debounceRef.current = null;
  const pending = pendingSaveRef.current;
  pendingSaveRef.current = null;
  if (pending) void saveDocumentUpdate(pending);
}, 600);
```

Each edit replaces the pending content with the latest version, cancels the previous timer, and starts a new timer. For example:

| Time | Event | Effect |
| --- | --- | --- |
| 0 ms | First edit | Schedule save for 600 ms. |
| 300 ms | Another edit | Cancel that timer; schedule save for 900 ms. |
| 700 ms | Another edit | Cancel that timer; schedule save for 1,300 ms. |
| 1,300 ms | No more edits | Queue one save containing the latest content. |

This is called **debouncing**. It saves after a pause, rather than on every keystroke or every 600 ms continuously. If an earlier save is still in flight, the new save waits in the request queue. The 600 ms is therefore the delay before queuing a save, not a guarantee of database completion.

Pausing frequently while typing can still trigger many saves. Each successful save follows the database path above, so frequent saves and repeated full-content results multiply the transfer usage.

No application code was changed for this explanation. The immediate redundant field identified here is `content: true` in the transaction read; removing it should be verified alongside the existing save and conflict tests.
