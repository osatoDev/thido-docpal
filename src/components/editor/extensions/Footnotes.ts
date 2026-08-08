import { Extension, Node, mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    footnotes: {
      insertFootnote: (text: string) => ReturnType;
    };
  }
}

function normalizeFootnoteId(value: unknown) {
  const id = String(value ?? "");
  return /^note-[1-9][0-9]*$/.test(id) ? id : "note-1";
}

function normalizeFootnoteNumber(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 1;
}

export const FootnoteReference = Node.create({
  name: "footnoteReference",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      footnoteId: { default: "note-1", rendered: false },
      number: { default: 1, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'sup[data-type="footnote-reference"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            footnoteId: normalizeFootnoteId(
              element.getAttribute("data-footnote-id"),
            ),
            number: normalizeFootnoteNumber(
              element.getAttribute("data-number"),
            ),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const footnoteId = normalizeFootnoteId(node.attrs.footnoteId);
    const number = normalizeFootnoteNumber(node.attrs.number);
    return [
      "sup",
      mergeAttributes(HTMLAttributes, {
        "data-type": "footnote-reference",
        "data-footnote-id": footnoteId,
        "data-number": String(number),
        id: `footnote-ref-${footnoteId}`,
      }),
      ["a", { href: `#footnote-${footnoteId}`, title: `Footnote ${number}` }, String(number)],
    ];
  },
});

export const Footnote = Node.create({
  name: "footnote",
  group: "block",
  content: "paragraph+",
  defining: true,

  addAttributes() {
    return {
      footnoteId: { default: "note-1", rendered: false },
      number: { default: 1, rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'aside[data-type="footnote"]',
        contentElement: '[data-footnote-content="true"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            footnoteId: normalizeFootnoteId(
              element.getAttribute("data-footnote-id"),
            ),
            number: normalizeFootnoteNumber(
              element.getAttribute("data-number"),
            ),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const footnoteId = normalizeFootnoteId(node.attrs.footnoteId);
    const number = normalizeFootnoteNumber(node.attrs.number);
    return [
      "aside",
      mergeAttributes(HTMLAttributes, {
        "data-type": "footnote",
        "data-footnote-id": footnoteId,
        "data-number": String(number),
        id: `footnote-${footnoteId}`,
      }),
      ["span", { class: "footnote-number" }, `${number}.`],
      ["div", { "data-footnote-content": "true" }, 0],
      [
        "a",
        {
          class: "footnote-backlink",
          href: `#footnote-ref-${footnoteId}`,
          title: `Back to footnote ${number}`,
          contenteditable: "false",
        },
        "↩",
      ],
    ];
  },
});

function nextFootnoteId(doc: ProseMirrorNode) {
  let maximum = 0;
  doc.descendants((node) => {
    if (node.type.name !== "footnoteReference" && node.type.name !== "footnote") {
      return;
    }
    const match = String(node.attrs.footnoteId ?? "").match(/^note-([1-9][0-9]*)$/);
    if (match) maximum = Math.max(maximum, Number(match[1]));
  });
  return `note-${maximum + 1}`;
}

export const Footnotes = Extension.create({
  name: "footnotes",

  addCommands() {
    return {
      insertFootnote:
        (text) =>
        ({ state, tr, dispatch }) => {
          const trimmed = text.trim();
          if (!trimmed) return false;
          const referenceType = state.schema.nodes.footnoteReference;
          const footnoteType = state.schema.nodes.footnote;
          const paragraphType = state.schema.nodes.paragraph;
          if (!referenceType || !footnoteType || !paragraphType) return false;

          const footnoteId = nextFootnoteId(state.doc);
          let number = 1;
          state.doc.descendants((node) => {
            if (node.type.name === "footnoteReference") number += 1;
          });
          const reference = referenceType.create({ footnoteId, number });
          if (state.selection.$from.parent.inlineContent) {
            tr.replaceSelectionWith(reference);
          } else {
            tr.insert(state.selection.to, paragraphType.create(null, reference));
          }
          const paragraph = paragraphType.create(null, state.schema.text(trimmed));
          tr.insert(
            tr.doc.content.size,
            footnoteType.create({ footnoteId, number }, paragraph),
          );
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
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

          const numberById = new Map<string, number>();
          const tr = newState.tr;
          let changed = false;
          newState.doc.descendants((node, position) => {
            if (node.type.name !== "footnoteReference") return;
            const footnoteId = normalizeFootnoteId(node.attrs.footnoteId);
            let number = numberById.get(footnoteId);
            if (!number) {
              number = numberById.size + 1;
              numberById.set(footnoteId, number);
            }
            if (node.attrs.number === number) return;
            tr.setNodeMarkup(position, undefined, { ...node.attrs, number });
            changed = true;
          });
          newState.doc.descendants((node, position) => {
            if (node.type.name !== "footnote") return;
            const number = numberById.get(
              normalizeFootnoteId(node.attrs.footnoteId),
            );
            if (!number || node.attrs.number === number) return;
            tr.setNodeMarkup(position, undefined, { ...node.attrs, number });
            changed = true;
          });
          return changed ? tr : null;
        },
      }),
    ];
  },
});
