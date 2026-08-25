# Document-wide comments

Thido supports two explicit comment targets:

- `SELECTION` for feedback attached to highlighted text.
- `DOCUMENT` for feedback about the draft as a whole.

The comments sidebar exposes **Comment on whole document**, so a reviewer can
create a document comment without selecting text. Selection comments begin
from the editor's **Add comment** action. Whole-document threads retain a
visible **Whole document** label.

Saving either kind of comment only adds it to the queue. It does not call the
model or wait for an individual response. Reviewers can leave multiple comments
and add context to open threads before an editor starts a batch.

## Actioning comments

An editor uses **Action comments with Thido** to process every open queued
comment together. Thido reads the full document and all comment targets, then
returns one coherent full-document revision. A selected target explains where
the concern originated but does not constrain the edit: the best solution may
change related text elsewhere in the document.

The editor remains visibly loading and the document is locked during the
foreground request. A revision is written only if the document has not changed
since the batch started. Successful batches add a reply to every comment,
resolve those threads, retain the applied full-document suggestion in the
archive, and record a normal AI document revision.

If the model call or safe application fails, the document is left untouched and
the comments remain available for retry.

## Data model

`Comment.scope` and `Suggestion.scope` continue to use `SELECTION` or
`DOCUMENT`. Queued comments use `Comment.aiStatus = NOT_REQUESTED`; all comments
claimed by an active batch use `PENDING`, and end as `SUCCEEDED` or `FAILED`.
No database migration is required.
