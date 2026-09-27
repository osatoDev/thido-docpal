# What AI-status polling does

**Polling means the browser repeatedly asks the server whether an AI job has finished.** It does not start another AI generation on each request. In Thido, the inefficiency is that these status checks currently fetch much more than status.

## When it runs

In [TiptapEditor.tsx](../src/components/editor/TiptapEditor.tsx), `pollForDocumentUnlock` runs when the editor needs to recover or wait for an AI-locked document—for example, opening a document that is already locked, receiving an AI-lock response while saving/commenting, or losing the response to an AI action.

It does **not** run on every keystroke or continuously during ordinary editing. A normal completed comment-action request can provide its updated document directly.

The polling loop contains:

```ts
for (let attempt = 0; attempt < 480; attempt += 1) {
  await new Promise((resolve) => setTimeout(resolve, 1250));
  if (!mountedRef.current) return;

  const response = await fetch(
    `/api/documents/${documentId}/comments`,
    { cache: "no-store" },
  );
  // Inspect documentAiLocked; stop when it becomes false.
}
```

Each loop waits 1.25 seconds, requests the comments endpoint, checks whether the document is still locked, and repeats if necessary. There are at most 480 attempts per loop: ten minutes of timer delays, plus time spent on requests. The existing loop stops when the editor unmounts, but has no hidden-tab pause, increasing delay between checks, or shared guard against multiple overlapping loops.

## Why this uses Neon transfer

The [comments GET handler](../src/app/api/documents/[id]/comments/route.ts) authenticates the request, checks access, and queries Neon with this selection:

```ts
select: {
  content: true,
  revision: true,
  comments: {
    where: { parentId: null },
    orderBy: { createdAt: "desc" },
    include: {
      author: { select: { name: true } },
      replies: {
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true } } },
      },
      suggestion: true,
    },
  },
}
```

`content: true` fetches the full document. The related results also contain comment text, replies, and suggestion text. The route checks for stale jobs and returns:

```ts
{
  comments,
  documentContent: document.content,
  documentRevision: document.revision,
  documentAiLocked: /* whether a comment job is still active */,
}
```

While the job is still running, the browser mostly needs the last field. It only installs the returned document content into the editor once the lock is released. Nevertheless, the entire content has already traveled **Neon → Vercel → browser** on every earlier check.

For a 200 KB document, 48 checks would transfer about **9.6 MB of document content** from Neon, plus comments and protocol overhead. Forty-eight checks per minute is an upper-rate illustration; actual requests take time. This is not a measured monthly usage figure.

## A more efficient design

Keep the status checks small:

```text
While working:
  browser asks for job status
  server reads only status/revision metadata
  response: { locked: true, revision: 42 }

Once complete:
  response: { locked: false, revision: 43 }
  browser fetches the updated document and comments once
```

Use one polling loop per document, pause or slow it when the tab is hidden, and increase the delay for longer jobs. Access checks and stale-job expiry still apply. Fetching content only when needed improves efficiency without requiring real-time collaborative merging, WebSockets, or a change to how the AI generates its response.

The database query must actually omit content. Simply removing `documentContent` from the HTTP response after the existing query would save browser traffic but would **not** save the Neon-to-Vercel transfer already incurred.

This turn explains the existing AI polling; it does not change its implementation. The independent version-history pagination and retention changes are documented in [version-history behavior](./version-history-pagination-and-retention.md).
