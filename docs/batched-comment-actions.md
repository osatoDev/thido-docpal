# Batched comment actions

Thido's comment workflow separates review from revision:

1. Reviewers add selection or whole-document comments.
2. Comments and additional context are saved without an AI request.
3. The sidebar shows how many comments are queued.
4. An editor chooses **Action comments with Thido**.
5. Thido reads the complete document and all queued feedback, then produces one
   coherent revision and a reply for every comment.

Selection anchors are references, not edit boundaries. This lets Thido solve a
local observation by restructuring a paragraph, changing a related section, or
making coordinated edits in several places.

## Safety behavior

The server claims the queued comments and locks the document before generation.
Autosave, import, restore, comment mutation, and suggestion acceptance respect
the same lock. The browser shows a loading state for the foreground batch and
can recover by polling if the connection drops or the page reloads.

The generated document is applied only when its source revision is still
current. A revision conflict, model failure, rate limit, or exhausted allowance
leaves the document unchanged and marks the comments ready to retry. Successful
batches record an AI revision, preserve document-level editor preferences, add
one AI reply per thread, and resolve the processed comments.

The batch consumes the same allowance weight as a whole-document comment action
and uses the user's selected model.
