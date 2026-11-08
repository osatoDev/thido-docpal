import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Starts a project's own to-do list: the header holds the project name, and
 * the blocks after it (up to the next day or project) are its tasks. Unlike a
 * day, a project has no date.
 */
export const ProjectHeader = Node.create({
  name: "projectHeader",
  group: "block",
  content: "inline*",
  defining: true,
  parseHTML() {
    return [{ tag: 'div[data-type="project-header"]', contentElement: "[data-project-name]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "project-header", class: "document-project-header" }),
      ["span", { "data-project-label": "", contenteditable: "false" }, "Project"],
      ["span", { "data-project-name": "" }, 0],
    ];
  },
  addKeyboardShortcuts() {
    return { Enter: () => {
      const { $from, empty } = this.editor.state.selection;
      if (!empty || $from.parent.type.name !== this.name || $from.parentOffset !== $from.parent.content.size) return false;
      // Enter at the end of the name starts the project's checklist.
      const next = this.editor.state.doc.resolve($from.after()).nodeAfter;
      if (next?.type.name === "taskList") {
        return this.editor.chain().setTextSelection($from.after() + 3).run();
      }
      return this.editor.chain()
        .insertContentAt($from.after(), { type: "taskList", content: [{ type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph" }] }] })
        .setTextSelection($from.after() + 3)
        .run();
    } };
  },
});
