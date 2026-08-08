import { Extension, Node, mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";

export type TableOfContentsEntry = {
  id: string;
  level: number;
  text: string;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    tableOfContents: {
      insertTableOfContents: () => ReturnType;
      refreshTableOfContents: () => ReturnType;
    };
  }
}

function normalizeEntries(value: unknown): TableOfContentsEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const candidate = entry as Record<string, unknown>;
    const id = String(candidate.id ?? "");
    const level = Number(candidate.level);
    const text = String(candidate.text ?? "").trim();
    if (
      !/^[a-z][a-z0-9-]{0,99}$/.test(id) ||
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6 ||
      !text
    ) {
      return [];
    }
    return [{ id, level, text: text.slice(0, 240) }];
  });
}

export function collectTableOfContentsEntries(doc: ProseMirrorNode) {
  const entries: TableOfContentsEntry[] = [];
  doc.descendants((node) => {
    if (node.type.name !== "heading") return;
    const id = String(node.attrs.headingId ?? "");
    const level = Number(node.attrs.level);
    const text = node.textContent.trim() || "Untitled heading";
    entries.push(...normalizeEntries([{ id, level, text }]));
  });
  return entries;
}

function sameEntries(
  first: TableOfContentsEntry[],
  second: TableOfContentsEntry[],
) {
  return (
    first.length === second.length &&
    first.every(
      (entry, index) =>
        entry.id === second[index]?.id &&
        entry.level === second[index]?.level &&
        entry.text === second[index]?.text,
    )
  );
}

function refreshContents(doc: ProseMirrorNode, tr: Transaction) {
  const entries = collectTableOfContentsEntries(doc);
  let changed = false;
  doc.descendants((node, position) => {
    if (node.type.name !== "tableOfContents") return;
    const current = normalizeEntries(node.attrs.entries);
    if (sameEntries(current, entries)) return;
    tr.setNodeMarkup(position, undefined, { entries });
    changed = true;
  });
  return changed;
}

export const TableOfContents = Node.create({
  name: "tableOfContents",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      entries: {
        default: [],
        rendered: false,
        parseHTML: (element: HTMLElement) => {
          const encoded = element.getAttribute("data-entries");
          if (!encoded) return [];
          try {
            return normalizeEntries(JSON.parse(decodeURIComponent(encoded)));
          } catch {
            return [];
          }
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'nav[data-type="table-of-contents"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const entries = normalizeEntries(node.attrs.entries);
    return [
      "nav",
      mergeAttributes(HTMLAttributes, {
        "data-type": "table-of-contents",
        "data-entries": encodeURIComponent(JSON.stringify(entries)),
        contenteditable: "false",
      }),
      ["p", { class: "table-of-contents-title" }, "Table of contents"],
      [
        "ol",
        {},
        ...entries.map((entry) => [
          "li",
          { "data-level": String(entry.level) },
          ["a", { href: `#${entry.id}` }, entry.text],
        ]),
      ],
    ];
  },
});

export const TableOfContentsCommands = Extension.create({
  name: "tableOfContentsCommands",

  addCommands() {
    return {
      insertTableOfContents:
        () =>
        ({ state, commands }) =>
          commands.insertContent({
            type: "tableOfContents",
            attrs: { entries: collectTableOfContentsEntries(state.doc) },
          }),
      refreshTableOfContents:
        () =>
        ({ state, tr, dispatch }) => {
          const changed = refreshContents(state.doc, tr);
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }
          const tr = newState.tr;
          return refreshContents(newState.doc, tr) ? tr : null;
        },
      }),
    ];
  },
});
