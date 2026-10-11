import { Node, mergeAttributes } from "@tiptap/core";
import { formatDay, validDay } from "@/lib/documentDays";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    dayHeader: { setDayHeader: (date: string) => ReturnType };
  }
}

export const DayHeader = Node.create({
  name: "dayHeader",
  group: "block",
  content: "inline*",
  defining: true,
  addAttributes() {
    return { date: { default: null, parseHTML: element => element.getAttribute("data-date"), renderHTML: attrs => ({ "data-date": attrs.date }) } };
  },
  parseHTML() {
    return [{ tag: 'div[data-type="day-header"]', contentElement: '[data-day-content]', getAttrs: element => validDay(element.getAttribute("data-date")) ? {} : false }];
  },
  renderHTML({ node, HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "day-header", class: "document-day-header" }),
      ["time", { datetime: node.attrs.date, contenteditable: "false" }, formatDay(node.attrs.date)],
      ["span", { "data-day-content": "" }, 0],
    ];
  },
  addCommands() {
    return { setDayHeader: date => ({ commands, state, tr }) => {
      if (!validDay(date) || state.selection.$from.depth !== 1 || state.selection.$from.parent !== state.selection.$to.parent) return false;
      const prefix = /^\/day(?:\s+|$)/.exec(state.selection.$from.parent.textContent);
      const start = state.selection.$from.start();
      if (!commands.setNode(this.name, { date })) return false;
      if (prefix) tr.delete(start, start + prefix[0].length);
      return true;
    } };
  },
  addKeyboardShortcuts() {
    return { Enter: () => {
      const { $from, empty } = this.editor.state.selection;
      if (this.editor.isEditable && empty && $from.depth === 1 &&
          $from.parentOffset === $from.parent.content.size &&
          /^\/day(?:\s|$)/.test($from.parent.textContent)) {
        this.editor.view.dom.dispatchEvent(new CustomEvent("thido:format-day"));
        return true;
      }
      if (!empty || $from.parent.type.name !== this.name || $from.parentOffset !== $from.parent.content.size) return false;
      return this.editor.chain().insertContentAt($from.after(), { type: "paragraph" }).setTextSelection($from.after() + 1).run();
    } };
  },
});
