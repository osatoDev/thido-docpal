# Comment scope policy

A comment's scope describes where the reviewer noticed a problem. It does not
limit where Thido may edit when the comments are actioned.

## Comment targets

- `SELECTION` comments stay visibly anchored to a highlighted passage.
- `DOCUMENT` comments apply to the draft as a whole and have no text anchor.

Both kinds are saved without starting an AI request. Reviewers can add several
comments, add further context to any open thread, and continue editing before an
editor asks Thido to action the queue.

## Batch editing policy

When an editor chooses **Action comments with Thido**, Thido receives the
complete current document and all open queued comments in one request. A
selection anchor is evidence about the reviewer's concern, not a replacement
boundary. Thido may change another sentence, a larger section, document
structure, or several related passages when that produces the best coherent
solution.

The batch prompt requires Thido to:

- read every comment before editing;
- reconcile overlapping or dependent requests;
- preserve content and structure unrelated to the feedback;
- return one complete revised document rather than independent patches; and
- provide one concise reply for every processed comment.

This deliberately replaces the older policy that constrained selection-comment
replacements to the active anchor.

## Concurrency and control

The action button is an explicit instruction to apply the queued feedback. The
document is locked while the batch runs and the editor shows a visible loading
state. Thido applies the revision only when the stored document revision still
matches the snapshot used for generation. If it changed, the result is not
written and the comments remain ready to retry.
