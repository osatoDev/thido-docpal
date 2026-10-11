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
    return { setDayHeader: date => ({ commands, state }) => {
      if (!validDay(date) || state.selection.$from.depth !== 1 || state.selection.$from.parent !== state.selection.$to.parent) return false;
      return commands.setNode(this.name, { date });
    } };
  },
  addKeyboardShortcuts() {
    return { Enter: () => {
      const { $from, empty } = this.editor.state.selection;
      if (!empty || $from.parent.type.name !== this.name || $from.parentOffset !== $from.parent.content.size) return false;
      return this.editor.chain().insertContentAt($from.after(), { type: "paragraph" }).setTextSelection($from.after() + 1).run();
    } };
  },
});
