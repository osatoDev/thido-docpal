import { Extension, type CommandProps } from "@tiptap/core";

const INDENTABLE_NODES = new Set(["paragraph", "heading"]);
const MAX_INDENT = 8;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textIndent: {
      increaseTextIndent: () => ReturnType;
      decreaseTextIndent: () => ReturnType;
    };
  }
}

function parseIndent(value: string | null) {
  const indent = Number(value);
  return Number.isInteger(indent)
    ? Math.min(MAX_INDENT, Math.max(0, indent))
    : 0;
}

export const TextIndent = Extension.create({
  name: "textIndent",

  addGlobalAttributes() {
    return [
      {
        types: [...INDENTABLE_NODES],
        attributes: {
          textIndent: {
            default: 0,
            parseHTML: (element) =>
              parseIndent(element.getAttribute("data-text-indent")),
            renderHTML: (attributes) => {
              const indent = parseIndent(String(attributes.textIndent ?? 0));
              return indent > 0
                ? {
                    "data-text-indent": String(indent),
                    style: `margin-left: ${indent * 2}rem`,
                  }
                : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const changeIndent =
      (delta: 1 | -1) =>
      ({ state, tr, dispatch }: CommandProps) => {
        let changed = false;
        const positions = new Set<number>();
        const { from, to, $from } = state.selection;

        state.doc.nodesBetween(from, to, (node, position) => {
          if (INDENTABLE_NODES.has(node.type.name)) positions.add(position);
        });

        if (positions.size === 0) {
          for (let depth = $from.depth; depth > 0; depth -= 1) {
            if (INDENTABLE_NODES.has($from.node(depth).type.name)) {
              positions.add($from.before(depth));
              break;
            }
          }
        }

        for (const position of positions) {
          const node = tr.doc.nodeAt(position);
          if (!node) continue;
          const currentIndent = parseIndent(String(node.attrs.textIndent ?? 0));
          const nextIndent = Math.min(
            MAX_INDENT,
            Math.max(0, currentIndent + delta),
          );
          if (nextIndent === currentIndent) continue;
          tr.setNodeMarkup(position, undefined, {
            ...node.attrs,
            textIndent: nextIndent,
          });
          changed = true;
        }

        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    return {
      increaseTextIndent: () => changeIndent(1),
      decreaseTextIndent: () => changeIndent(-1),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-]": () => this.editor.commands.increaseTextIndent(),
      "Mod-[": () => this.editor.commands.decreaseTextIndent(),
    };
  },
});
