import { Extension, Node, type CommandProps } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";

export const DOCUMENT_LANGUAGE_OPTIONS = [
  { label: "English (US)", value: "en-US" },
  { label: "English (UK)", value: "en-GB" },
  { label: "German", value: "de-DE" },
  { label: "French", value: "fr-FR" },
  { label: "Spanish", value: "es-ES" },
] as const;

export type DocumentDirection = "ltr" | "rtl";
export type DocumentPreferencesValue = {
  language: string;
  spellcheck: boolean;
  direction: DocumentDirection;
};

const DEFAULT_PREFERENCES: DocumentPreferencesValue = {
  language: "en-US",
  spellcheck: true,
  direction: "ltr",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentPreferences: {
      setDocumentLanguage: (language: string) => ReturnType;
      setDocumentSpellcheck: (enabled: boolean) => ReturnType;
      setDocumentDirection: (direction: DocumentDirection) => ReturnType;
    };
  }
}

function normalizeLanguage(value: unknown) {
  return DOCUMENT_LANGUAGE_OPTIONS.some((option) => option.value === value)
    ? String(value)
    : DEFAULT_PREFERENCES.language;
}

function normalizeDirection(value: unknown): DocumentDirection {
  return value === "rtl" ? "rtl" : "ltr";
}

export function getDocumentPreferences(
  doc: ProseMirrorNode,
): DocumentPreferencesValue {
  let preferences = DEFAULT_PREFERENCES;
  doc.descendants((node) => {
    if (node.type.name !== "documentPreferences") return;
    preferences = {
      language: normalizeLanguage(node.attrs.language),
      spellcheck: node.attrs.spellcheck !== false,
      direction: normalizeDirection(node.attrs.direction),
    };
    return false;
  });
  return preferences;
}

function updatePreferences(
  patch: Partial<DocumentPreferencesValue>,
): (props: CommandProps) => boolean {
  return ({ state, tr, dispatch }) => {
    let settingsPosition: number | null = null;
    let current = DEFAULT_PREFERENCES;
    state.doc.descendants((node, position) => {
      if (node.type.name !== "documentPreferences") return;
      settingsPosition = position;
      current = {
        language: normalizeLanguage(node.attrs.language),
        spellcheck: node.attrs.spellcheck !== false,
        direction: normalizeDirection(node.attrs.direction),
      };
      return false;
    });

    const next = { ...current, ...patch };
    if (settingsPosition === null) {
      const settingsNode = state.schema.nodes.documentPreferences?.create(next);
      if (!settingsNode) return false;
      tr.insert(0, settingsNode);
    } else {
      tr.setNodeMarkup(settingsPosition, undefined, next);
    }
    if (dispatch) dispatch(tr);
    return true;
  };
}

function applyPreferencesToEditor(view: EditorView) {
  const preferences = getDocumentPreferences(view.state.doc);
  const editor = view.dom;
  editor.lang = preferences.language;
  editor.dir = preferences.direction;
  editor.spellcheck = preferences.spellcheck;
  editor.setAttribute("data-document-language", preferences.language);
}

export const DocumentPreferencesNode = Node.create({
  name: "documentPreferences",
  group: "block",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      language: {
        default: DEFAULT_PREFERENCES.language,
        parseHTML: (element: HTMLElement) =>
          normalizeLanguage(element.getAttribute("data-language")),
      },
      spellcheck: {
        default: DEFAULT_PREFERENCES.spellcheck,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-spellcheck") !== "false",
      },
      direction: {
        default: DEFAULT_PREFERENCES.direction,
        parseHTML: (element: HTMLElement) =>
          normalizeDirection(element.getAttribute("data-direction")),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="document-preferences"]' }];
  },

  renderHTML({ node }) {
    const preferences = {
      language: normalizeLanguage(node.attrs.language),
      spellcheck: node.attrs.spellcheck !== false,
      direction: normalizeDirection(node.attrs.direction),
    };
    return [
      "div",
      {
        "data-type": "document-preferences",
        "data-language": preferences.language,
        "data-spellcheck": String(preferences.spellcheck),
        "data-direction": preferences.direction,
        hidden: "hidden",
      },
    ];
  },
});

export const DocumentPreferences = Extension.create({
  name: "documentPreferencesCommands",

  addCommands() {
    return {
      setDocumentLanguage: (language) =>
        updatePreferences({ language: normalizeLanguage(language) }),
      setDocumentSpellcheck: (spellcheck) =>
        updatePreferences({ spellcheck }),
      setDocumentDirection: (direction) =>
        updatePreferences({ direction: normalizeDirection(direction) }),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        view(view) {
          applyPreferencesToEditor(view);
          return {
            update(nextView) {
              applyPreferencesToEditor(nextView);
            },
          };
        },
      }),
    ];
  },
});
