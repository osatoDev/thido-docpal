import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";

export type TextCleanupMode =
  | "collapseSpaces"
  | "tabsToSpaces"
  | "removeZeroWidth"
  | "removeSoftHyphens"
  | "replaceNonBreakingSpaces"
  | "normalizeUnicodeSpaces"
  | "smartQuotes"
  | "straightQuotes"
  | "normalizeDashes"
  | "normalizeEllipses";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textCleanup: {
      cleanUpText: (mode: TextCleanupMode) => ReturnType;
    };
  }
}

function currentTextRange(state: EditorState) {
  if (!state.selection.empty) {
    return { from: state.selection.from, to: state.selection.to };
  }

  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if (!$from.node(depth).isTextblock) continue;
    return { from: $from.start(depth), to: $from.end(depth) };
  }
  return null;
}

export function transformCleanupText(text: string, mode: TextCleanupMode) {
  switch (mode) {
    case "collapseSpaces":
      return text.replace(/ {2,}/gu, " ");
    case "tabsToSpaces":
      return text.replace(/\t/gu, "  ");
    case "removeZeroWidth":
      return text.replace(/[\u200B\u200C\u200D\uFEFF]/gu, "");
    case "removeSoftHyphens":
      return text.replace(/\u00AD/gu, "");
    case "replaceNonBreakingSpaces":
      return text.replace(/\u00A0/gu, " ");
    case "normalizeUnicodeSpaces":
      return text.replace(/[\u2000-\u200A\u202F\u205F\u3000]/gu, " ");
    case "smartQuotes": {
      let result = text.replace(/(^|[\s([{\u2014–])"(?=\S)/gu, "$1“");
      result = result.replace(/"/gu, "”");
      result = result.replace(/(^|[\s([{\u2014–])'(?=\S)/gu, "$1‘");
      return result.replace(/'/gu, "’");
    }
    case "straightQuotes":
      return text.replace(/[“”]/gu, '"').replace(/[‘’]/gu, "'");
    case "normalizeDashes":
      return text.replace(/---/gu, "\u2014").replace(/--/gu, "\u2014");
    case "normalizeEllipses":
      return text.replace(/\.{3}/gu, "…");
  }
}

export const TextCleanup = Extension.create({
  name: "textCleanup",

  addCommands() {
    return {
      cleanUpText:
        (mode) =>
        ({ state, tr, dispatch }) => {
          const range = currentTextRange(state);
          if (!range) return false;

          const replacements: Array<{
            from: number;
            to: number;
            text: string;
            marks: typeof state.storedMarks;
          }> = [];

          state.doc.nodesBetween(range.from, range.to, (node, position) => {
            if (!node.isText) return;
            const from = Math.max(range.from, position);
            const to = Math.min(range.to, position + node.nodeSize);
            const text = (node.text ?? "").slice(
              from - position,
              to - position,
            );
            const transformed = transformCleanupText(text, mode);
            if (transformed === text) return;
            replacements.push({
              from,
              to,
              text: transformed,
              marks: node.marks,
            });
          });

          if (replacements.length === 0) return false;
          if (dispatch) {
            for (const replacement of replacements.reverse()) {
              if (replacement.text) {
                tr.replaceWith(
                  replacement.from,
                  replacement.to,
                  state.schema.text(
                    replacement.text,
                    replacement.marks ?? [],
                  ),
                );
              } else {
                tr.delete(replacement.from, replacement.to);
              }
            }
            dispatch(tr);
          }
          return true;
        },
    };
  },
});
