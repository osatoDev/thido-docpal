import { Extension } from "@tiptap/core";

export type TextCaseMode = "uppercase" | "lowercase" | "title";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textCase: {
      changeTextCase: (mode: TextCaseMode) => ReturnType;
    };
  }
}

export function transformTextCase(text: string, mode: TextCaseMode) {
  if (mode === "uppercase") return text.toLocaleUpperCase();
  if (mode === "lowercase") return text.toLocaleLowerCase();
  return text.replace(/\b([A-Za-z])([A-Za-z']*)/g, (_, first, rest) =>
    `${first.toUpperCase()}${rest.toLowerCase()}`,
  );
}

export const TextCase = Extension.create({
  name: "textCase",

  addCommands() {
    return {
      changeTextCase:
        (mode) =>
        ({ state, tr, dispatch }) => {
          const { from, to, empty } = state.selection;
          if (empty) return false;

          const replacements: Array<{
            from: number;
            to: number;
            text: string;
            marks: typeof state.storedMarks;
          }> = [];

          state.doc.nodesBetween(from, to, (node, position) => {
            if (!node.isText) return;
            const start = Math.max(from, position);
            const end = Math.min(to, position + node.nodeSize);
            const selectedText = (node.text ?? "").slice(
              start - position,
              end - position,
            );
            replacements.push({
              from: start,
              to: end,
              text: transformTextCase(selectedText, mode),
              marks: node.marks,
            });
          });

          if (dispatch) {
            for (const replacement of replacements.reverse()) {
              tr.replaceWith(
                replacement.from,
                replacement.to,
                state.schema.text(replacement.text, replacement.marks ?? []),
              );
            }
          }

          return replacements.length > 0;
        },
    };
  },
});
