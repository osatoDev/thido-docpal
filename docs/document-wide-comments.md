# Document-wide comments

Today, a user cannot create a true whole-document comment in Thido.

## Why

The current comment flow is anchored to a text selection:

- The editor only starts a comment when there is a non-empty selection (`from !== to`) in [src/components/editor/TiptapEditor.tsx](/Users/osatohanmwenguobadia/Documents/GitHub/thido-docpal/src/components/editor/TiptapEditor.tsx).
- The composer always shows quoted selected text, not a general document target, in [src/components/comments/CommentComposer.tsx](/Users/osatohanmwenguobadia/Documents/GitHub/thido-docpal/src/components/comments/CommentComposer.tsx).
- The comments API rejects requests unless `anchorMarkId`, `quotedText`, and `body` are all present, in [src/app/api/documents/[id]/comments/route.ts](/Users/osatohanmwenguobadia/Documents/GitHub/thido-docpal/src/app/api/documents/[id]/comments/route.ts).
- The database model requires every comment to carry `anchorMarkId` and `quotedText`, in [prisma/schema.prisma](/Users/osatohanmwenguobadia/Documents/GitHub/thido-docpal/prisma/schema.prisma).

So the current answer is: they cannot do it unless they attach the comment to some selected text.

## Best implementation

If you want whole-document comments, the cleanest product shape is:

1. Add a second comment target type: `SELECTION` and `DOCUMENT`.
2. Make `anchorMarkId` and `quotedText` nullable for `DOCUMENT` comments.
3. Add a visible `Add general comment` action in the comment sidebar or editor header.
4. Render document-level comments in a separate `General comments` section above anchored threads.
5. Do not run anchor-replacement AI suggestion logic for document-level comments by default, because there is no bounded replacement span.

## Why this is better than faking it

An inferior workaround would be anchoring a "whole-document" comment to the title or the first paragraph. That would make threading and AI behavior ambiguous, and it would break once that anchored text is rewritten or removed.

If you want, the next change should be implementing a first-class `DOCUMENT` comment type rather than trying to simulate it with the current anchored model.
