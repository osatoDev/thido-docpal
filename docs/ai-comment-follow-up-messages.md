# Additional context in queued comments

An open comment thread accepts additional user messages before Thido actions
the document. The composer is available as soon as the first comment is saved;
it no longer waits for an AI response.

Each message is stored durably in the existing thread and keeps that thread in
the document's comment queue. Adding context does not make an AI call. When an
editor later chooses **Action comments with Thido**, the batch prompt contains
the top-level comment and its ordered user messages alongside the complete
document and the other queued threads.

The existing permission and concurrency rules still apply:

- view-only users cannot add messages;
- resolved threads must be reopened before more context is added;
- an active batch blocks comments, replies, and document edits; and
- only users with edit access can action the queue.

Legacy threads that already own an edit suggestion keep that suggestion's
review lifecycle and are not added to a new batch.
