import { Mark } from "@tiptap/core";

/**
 * Comments were removed in Thido 2.0, but documents saved before then can
 * still contain comment marks. Tiptap replaces content it cannot parse with
 * an empty document, so the mark stays in the schema and renders as a plain
 * span to keep those documents loading intact.
 */
export const CommentMark = Mark.create({
  name: "comment",

  inclusive: false,

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-comment-id"),
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML() {
    return ["span", 0];
  },
});
