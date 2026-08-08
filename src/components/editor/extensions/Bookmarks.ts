import { Extension, Node, mergeAttributes } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { Transaction } from "@tiptap/pm/state";

export type DocumentBookmark = {
  bookmarkId: string;
  domId: string;
  label: string;
  position: number;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bookmarks: {
      insertBookmark: (label: string) => ReturnType;
      renameBookmark: (bookmarkId: string, label: string) => ReturnType;
      deleteBookmark: (bookmarkId: string) => ReturnType;
      ensureUniqueBookmarks: () => ReturnType;
    };
  }
}

const BOOKMARK_ID = /^mark-[1-9][0-9]*$/;

function normalizeBookmarkId(value: unknown) {
  const bookmarkId = String(value ?? "");
  return BOOKMARK_ID.test(bookmarkId) ? bookmarkId : "mark-1";
}

function normalizeBookmarkLabel(value: unknown) {
  const label = String(value ?? "").trim().replace(/\s+/gu, " ");
  return (label || "Bookmark").slice(0, 80);
}

export function bookmarkDomId(bookmarkId: string) {
  return `bookmark-${normalizeBookmarkId(bookmarkId)}`;
}

export function readDocumentBookmarks(doc: ProseMirrorNode) {
  const bookmarks: DocumentBookmark[] = [];
  doc.descendants((node, position) => {
    if (node.type.name !== "bookmark") return;
    const bookmarkId = normalizeBookmarkId(node.attrs.bookmarkId);
    bookmarks.push({
      bookmarkId,
      domId: bookmarkDomId(bookmarkId),
      label: normalizeBookmarkLabel(node.attrs.label),
      position,
    });
  });
  return bookmarks;
}

function nextBookmarkId(doc: ProseMirrorNode, reserved = new Set<string>()) {
  let maximum = 0;
  doc.descendants((node) => {
    if (node.type.name !== "bookmark") return;
    const match = String(node.attrs.bookmarkId ?? "").match(
      /^mark-([1-9][0-9]*)$/,
    );
    if (match) maximum = Math.max(maximum, Number(match[1]));
  });
  let bookmarkId = `mark-${maximum + 1}`;
  while (reserved.has(bookmarkId)) {
    maximum += 1;
    bookmarkId = `mark-${maximum + 1}`;
  }
  return bookmarkId;
}

function makeBookmarksUnique(doc: ProseMirrorNode, tr: Transaction) {
  const used = new Set<string>();
  let changed = false;
  doc.descendants((node, position) => {
    if (node.type.name !== "bookmark") return;
    let bookmarkId = normalizeBookmarkId(node.attrs.bookmarkId);
    if (used.has(bookmarkId)) bookmarkId = nextBookmarkId(doc, used);
    used.add(bookmarkId);
    const label = normalizeBookmarkLabel(node.attrs.label);
    if (
      bookmarkId === node.attrs.bookmarkId &&
      label === node.attrs.label
    ) {
      return;
    }
    tr.setNodeMarkup(position, undefined, { bookmarkId, label });
    changed = true;
  });
  return changed;
}

export const Bookmark = Node.create({
  name: "bookmark",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      bookmarkId: { default: "mark-1", rendered: false },
      label: { default: "Bookmark", rendered: false },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="bookmark"]',
        getAttrs: (element) => {
          if (typeof element === "string") return false;
          return {
            bookmarkId: normalizeBookmarkId(
              element.getAttribute("data-bookmark-id"),
            ),
            label: normalizeBookmarkLabel(element.getAttribute("data-label")),
          };
        },
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    const bookmarkId = normalizeBookmarkId(node.attrs.bookmarkId);
    const label = normalizeBookmarkLabel(node.attrs.label);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "bookmark",
        "data-bookmark-id": bookmarkId,
        "data-label": label,
        id: bookmarkDomId(bookmarkId),
        title: label,
        contenteditable: "false",
      }),
      ["span", { "aria-hidden": "true" }, "🔖"],
      ["span", { class: "bookmark-label" }, label],
    ];
  },
});

export const Bookmarks = Extension.create({
  name: "bookmarks",

  onCreate() {
    this.editor.commands.ensureUniqueBookmarks();
  },

  addCommands() {
    return {
      insertBookmark:
        (label) =>
        ({ state, tr, dispatch }) => {
          const bookmarkType = state.schema.nodes.bookmark;
          const paragraphType = state.schema.nodes.paragraph;
          if (!bookmarkType || !paragraphType) return false;
          const bookmarkId = nextBookmarkId(state.doc);
          const bookmark = bookmarkType.create({
            bookmarkId,
            label: normalizeBookmarkLabel(label),
          });
          if (state.selection.$from.parent.inlineContent) {
            tr.replaceSelectionWith(bookmark);
          } else {
            tr.insert(state.selection.to, paragraphType.create(null, bookmark));
          }
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      renameBookmark:
        (bookmarkId, label) =>
        ({ state, tr, dispatch }) => {
          const normalizedId = normalizeBookmarkId(bookmarkId);
          const normalizedLabel = normalizeBookmarkLabel(label);
          let changed = false;
          state.doc.descendants((node, position) => {
            if (
              node.type.name !== "bookmark" ||
              normalizeBookmarkId(node.attrs.bookmarkId) !== normalizedId
            ) {
              return;
            }
            if (node.attrs.label === normalizedLabel) return false;
            tr.setNodeMarkup(position, undefined, {
              ...node.attrs,
              label: normalizedLabel,
            });
            changed = true;
            return false;
          });
          if (changed && dispatch) dispatch(tr);
          return changed;
        },
      deleteBookmark:
        (bookmarkId) =>
        ({ state, tr, dispatch }) => {
          const normalizedId = normalizeBookmarkId(bookmarkId);
          let deleteFrom: number | null = null;
          let deleteTo: number | null = null;
          state.doc.descendants((node, position) => {
            if (
              node.type.name === "bookmark" &&
              normalizeBookmarkId(node.attrs.bookmarkId) === normalizedId
            ) {
              deleteFrom = position;
              deleteTo = position + node.nodeSize;
              return false;
            }
          });
          if (deleteFrom === null || deleteTo === null) return false;
          tr.delete(deleteFrom, deleteTo);
          if (dispatch) dispatch(tr);
          return true;
        },
      ensureUniqueBookmarks:
        () =>
        ({ state, tr, dispatch }) => {
          const changed = makeBookmarksUnique(state.doc, tr);
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
          return makeBookmarksUnique(newState.doc, tr) ? tr : null;
        },
      }),
    ];
  },
});
