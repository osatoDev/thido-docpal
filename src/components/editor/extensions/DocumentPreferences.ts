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

export const DOCUMENT_APPEARANCE_OPTIONS = [
  {
    label: "Classic",
    value: "classic",
    description: "Traditional serif typography with comfortable spacing.",
  },
  {
    label: "Clean",
    value: "clean",
    description: "Crisp sans-serif typography for practical documents.",
  },
  {
    label: "Editorial",
    value: "editorial",
    description: "Publication-inspired typography with expressive headings.",
  },
  {
    label: "Warm",
    value: "warm",
    description: "A softer paper tone and relaxed reading rhythm.",
  },
  {
    label: "Bold",
    value: "bold",
    description: "High-contrast headings for pitches and presentations.",
  },
] as const;

export const DOCUMENT_SIDE_MARGIN_OPTIONS = [
  { label: "Narrow · 20 mm", value: "narrow", millimeters: 20 },
  { label: "Standard · 40 mm", value: "standard", millimeters: 40 },
  { label: "Wide · 60 mm", value: "wide", millimeters: 60 },
] as const;

export type DocumentDirection = "ltr" | "rtl";
export type DocumentAppearance =
  (typeof DOCUMENT_APPEARANCE_OPTIONS)[number]["value"];
export type DocumentSideMargin =
  (typeof DOCUMENT_SIDE_MARGIN_OPTIONS)[number]["value"];
export type DocumentPreferencesValue = {
  language: string;
  spellcheck: boolean;
  direction: DocumentDirection;
  appearance: DocumentAppearance;
  sideMargin: DocumentSideMargin;
};

const DEFAULT_PREFERENCES: DocumentPreferencesValue = {
  language: "en-US",
  spellcheck: true,
  direction: "ltr",
  appearance: "classic",
  sideMargin: "standard",
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentPreferences: {
      setDocumentLanguage: (language: string) => ReturnType;
      setDocumentSpellcheck: (enabled: boolean) => ReturnType;
      setDocumentDirection: (direction: DocumentDirection) => ReturnType;
      setDocumentAppearance: (appearance: DocumentAppearance) => ReturnType;
      setDocumentSideMargin: (sideMargin: DocumentSideMargin) => ReturnType;
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

function normalizeAppearance(value: unknown): DocumentAppearance {
  return DOCUMENT_APPEARANCE_OPTIONS.some((option) => option.value === value)
    ? (value as DocumentAppearance)
    : DEFAULT_PREFERENCES.appearance;
}

export function normalizeDocumentSideMargin(
  value: unknown,
): DocumentSideMargin {
  return DOCUMENT_SIDE_MARGIN_OPTIONS.some((option) => option.value === value)
    ? (value as DocumentSideMargin)
    : DEFAULT_PREFERENCES.sideMargin;
}

export function getDocumentSideMarginMillimeters(content: {
  content?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
} | null): number {
  const preferences = content?.content?.find(
    (node) => node.type === "documentPreferences",
  );
  const sideMargin = normalizeDocumentSideMargin(
    preferences?.attrs?.sideMargin,
  );
  return (
    DOCUMENT_SIDE_MARGIN_OPTIONS.find(
      (option) => option.value === sideMargin,
    )?.millimeters ??
    DOCUMENT_SIDE_MARGIN_OPTIONS.find(
      (option) => option.value === DEFAULT_PREFERENCES.sideMargin,
    )!.millimeters
  );
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
      appearance: normalizeAppearance(node.attrs.appearance),
      sideMargin: normalizeDocumentSideMargin(node.attrs.sideMargin),
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
        appearance: normalizeAppearance(node.attrs.appearance),
        sideMargin: normalizeDocumentSideMargin(node.attrs.sideMargin),
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
  editor.setAttribute("data-document-appearance", preferences.appearance);
  editor.setAttribute("data-document-side-margin", preferences.sideMargin);
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
      appearance: {
        default: DEFAULT_PREFERENCES.appearance,
        parseHTML: (element: HTMLElement) =>
          normalizeAppearance(element.getAttribute("data-appearance")),
      },
      sideMargin: {
        default: DEFAULT_PREFERENCES.sideMargin,
        parseHTML: (element: HTMLElement) =>
          normalizeDocumentSideMargin(element.getAttribute("data-side-margin")),
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
      appearance: normalizeAppearance(node.attrs.appearance),
      sideMargin: normalizeDocumentSideMargin(node.attrs.sideMargin),
    };
    return [
      "div",
      {
        "data-type": "document-preferences",
        "data-language": preferences.language,
        "data-spellcheck": String(preferences.spellcheck),
        "data-direction": preferences.direction,
        "data-appearance": preferences.appearance,
        "data-side-margin": preferences.sideMargin,
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
      setDocumentAppearance: (appearance) =>
        updatePreferences({ appearance: normalizeAppearance(appearance) }),
      setDocumentSideMargin: (sideMargin) =>
        updatePreferences({
          sideMargin: normalizeDocumentSideMargin(sideMargin),
        }),
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
