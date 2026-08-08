import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    headingAnchors: {
      ensureHeadingAnchors: () => ReturnType;
    };
  }
}

const SAFE_HEADING_ID = /^[a-z][a-z0-9-]{0,99}$/;

export function slugifyHeading(text: string) {
  const slug = text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return /^[a-z]/.test(slug) ? slug : `section${slug ? `-${slug}` : ""}`;
}

function addHeadingAnchors(doc: ProseMirrorNode, tr: Transaction) {
  const used = new Set<string>();
  let changed = false;

  doc.descendants((node, position) => {
    if (node.type.name !== "heading") return;
    const current = String(node.attrs.headingId ?? "");
    let headingId = current;
    if (!SAFE_HEADING_ID.test(current) || used.has(current)) {
      const base = slugifyHeading(node.textContent);
      headingId = base;
      let suffix = 2;
      while (used.has(headingId)) {
        headingId = `${base}-${suffix}`;
        suffix += 1;
      }
    }
    used.add(headingId);
    if (headingId === current) return;
    tr.setNodeMarkup(position, undefined, { ...node.attrs, headingId });
    changed = true;
  });

  return changed;
}

export const HeadingAnchors = Extension.create({
  name: "headingAnchors",

  onCreate() {
    this.editor.commands.ensureHeadingAnchors();
  },

  addCommands() {
    return {
      ensureHeadingAnchors:
        () =>
        ({ state, tr, dispatch }) => {
          const changed = addHeadingAnchors(state.doc, tr);
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
          const changed = addHeadingAnchors(newState.doc, tr);
          return changed ? tr : null;
        },
      }),
    ];
  },
});
