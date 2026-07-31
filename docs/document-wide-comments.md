# Document-wide comments

Thido supports two explicit comment targets:

- `SELECTION` for feedback tied to highlighted text.
- `DOCUMENT` for feedback or changes that apply to the entire draft.

## User experience

The comments sidebar contains a visible **Comment on whole document** action. It
opens a composer that explains the scope and gives a concrete example such as
“Remove all Markdown from this document.” No text selection is required.

Selection comments still begin from the editor’s Comment action. If a user
starts from selected text but writes an unmistakably document-wide request,
Thido removes the temporary selection anchor and promotes the request to the
document scope.

Document comments and their threads carry a **Whole document** label so the
scope stays visible after submission.

## Editing behavior

Document comments are processed in the foreground. Thido reads the complete
document and:

- returns a reply without changing the draft for questions or feedback; or
- creates a full-document revision for change requests.

In propose mode, the revision can be reviewed and accepted or rejected. In
auto-apply mode, Thido applies it only if the document has not changed while
the model was working. Concurrent edits cause the revision to remain pending
instead of overwriting newer work.

Document text is converted back into the editor’s structured format when a
full-document revision is accepted or safely auto-applied.

## Data model

`Comment.scope` and `Suggestion.scope` use `SELECTION` or `DOCUMENT`.
`anchorMarkId` and `quotedText` are nullable because document comments do not
pretend to be attached to the title or first paragraph. Existing comments and
suggestions default to `SELECTION`.
