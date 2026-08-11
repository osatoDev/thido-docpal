import { Mark, mergeAttributes } from "@tiptap/core";

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: () => ReturnType;
    };
  }
}

/**
 * A ProseMirror mark that anchors a Comment to a span of text. Modeled on
 * the open-source `@tiptap/extension-highlight` mark rather than Tiptap
 * Pro's paid Comments extension. It uses the same mechanism (a mark carrying an
 * attribute), just scoped to what this app needs.
 */
export const CommentMark = Mark.create<CommentMarkOptions>({
  name: "comment",

  addOptions() {
    return { HTMLAttributes: {} };
  },

  // Typing at the edge of a commented range extends the mark, matching how
  // a real comment highlight should behave as the surrounding text is edited.
  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: (attributes) => {
          if (!attributes.commentId) return {};
          return { "data-comment-id": attributes.commentId };
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: "comment-highlight",
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setComment:
        (commentId: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { commentId }),
      unsetComment:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
    };
  },
});
