import { Extension } from "@tiptap/core";

export type TextCaseMode =
  | "uppercase"
  | "lowercase"
  | "title"
  | "sentence"
  | "toggle";

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
  if (mode === "toggle") {
    return Array.from(text, (character) => {
      const upper = character.toLocaleUpperCase();
      const lower = character.toLocaleLowerCase();
      if (upper === lower) return character;
      return character === upper ? lower : upper;
    }).join("");
  }
  if (mode === "sentence") {
    let capitalizeNext = true;
    return Array.from(text.toLocaleLowerCase(), (character) => {
      if (/[.!?]/u.test(character)) {
        capitalizeNext = true;
        return character;
      }
      if (!/\p{L}/u.test(character)) return character;
      if (!capitalizeNext) return character;
      capitalizeNext = false;
      return character.toLocaleUpperCase();
    }).join("");
  }
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
              text: selectedText,
              marks: node.marks,
            });
          });

          if (mode === "sentence") {
            const transformed = transformTextCase(
              replacements.map((replacement) => replacement.text).join(""),
              mode,
            );
            let offset = 0;
            for (const replacement of replacements) {
              const length = Array.from(replacement.text).length;
              replacement.text = Array.from(transformed)
                .slice(offset, offset + length)
                .join("");
              offset += length;
            }
          } else {
            for (const replacement of replacements) {
              replacement.text = transformTextCase(replacement.text, mode);
            }
          }

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
