import { Extension } from "@tiptap/core";
import type { EditorState } from "@tiptap/pm/state";
import { TextSelection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentNavigation: {
      goToPreviousHeading: () => ReturnType;
      goToNextHeading: () => ReturnType;
      goToDocumentStart: () => ReturnType;
      goToDocumentEnd: () => ReturnType;
      goToPreviousParagraph: () => ReturnType;
      goToNextParagraph: () => ReturnType;
      goToPreviousTable: () => ReturnType;
      goToNextTable: () => ReturnType;
    };
  }
}

function ancestorPosition(state: EditorState, nodeType: string) {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type.name === nodeType) return $from.before(depth);
  }
  return null;
}

function adjacentNodePosition(
  state: EditorState,
  nodeType: string,
  direction: "previous" | "next",
) {
  const current = ancestorPosition(state, nodeType) ?? state.selection.from;
  let target: number | null = null;
  state.doc.descendants((node, position) => {
    if (node.type.name !== nodeType) return;
    if (direction === "previous" && position < current) target = position;
    if (direction === "next" && position > current && target === null) {
      target = position;
      return false;
    }
  });
  return target;
}

function navigateToPosition(
  position: number | null,
  state: EditorState,
  dispatch: ((transaction: typeof state.tr) => void) | undefined,
  view: { focus: () => void },
) {
  if (position === null) return false;
  const tr = state.tr.setSelection(
    TextSelection.near(state.doc.resolve(position + 1), 1),
  );
  if (dispatch) {
    dispatch(tr.scrollIntoView());
    view.focus();
  }
  return true;
}

export const DocumentNavigation = Extension.create({
  name: "documentNavigation",

  addCommands() {
    return {
      goToPreviousHeading:
        () =>
        ({ state, tr, dispatch, view }) => {
          let target: number | null = null;
          state.doc.descendants((node, position) => {
            if (node.type.name === "heading" && position + 1 < state.selection.from) {
              target = position + 1;
            }
          });
          if (target === null) return false;
          tr.setSelection(TextSelection.create(state.doc, target));
          if (dispatch) {
            dispatch(tr.scrollIntoView());
            view.focus();
          }
          return true;
        },
      goToNextHeading:
        () =>
        ({ state, tr, dispatch, view }) => {
          let target: number | null = null;
          state.doc.descendants((node, position) => {
            if (
              target === null &&
              node.type.name === "heading" &&
              position + 1 > state.selection.from
            ) {
              target = position + 1;
              return false;
            }
          });
          if (target === null) return false;
          tr.setSelection(TextSelection.create(state.doc, target));
          if (dispatch) {
            dispatch(tr.scrollIntoView());
            view.focus();
          }
          return true;
        },
      goToDocumentStart:
        () =>
        ({ state, dispatch, view }) => {
          let target: number | null = null;
          state.doc.descendants((node, position) => {
            if (target !== null || node.type.name === "documentPreferences" || node.type.name === "planProjects") {
              return;
            }
            if (node.isTextblock) {
              target = position;
              return false;
            }
          });
          return navigateToPosition(target, state, dispatch, view);
        },
      goToDocumentEnd:
        () =>
        ({ state, dispatch, view }) => {
          const tr = state.tr.setSelection(TextSelection.atEnd(state.doc));
          if (dispatch) {
            dispatch(tr.scrollIntoView());
            view.focus();
          }
          return true;
        },
      goToPreviousParagraph:
        () =>
        ({ state, dispatch, view }) =>
          navigateToPosition(
            adjacentNodePosition(state, "paragraph", "previous"),
            state,
            dispatch,
            view,
          ),
      goToNextParagraph:
        () =>
        ({ state, dispatch, view }) =>
          navigateToPosition(
            adjacentNodePosition(state, "paragraph", "next"),
            state,
            dispatch,
            view,
          ),
      goToPreviousTable:
        () =>
        ({ state, dispatch, view }) =>
          navigateToPosition(
            adjacentNodePosition(state, "table", "previous"),
            state,
            dispatch,
            view,
          ),
      goToNextTable:
        () =>
        ({ state, dispatch, view }) =>
          navigateToPosition(
            adjacentNodePosition(state, "table", "next"),
            state,
            dispatch,
            view,
          ),
    };
  },

  addKeyboardShortcuts() {
    return {
      "Alt-Shift-PageUp": () => this.editor.commands.goToPreviousHeading(),
      "Alt-Shift-PageDown": () => this.editor.commands.goToNextHeading(),
      "Alt-Shift-ArrowUp": () => this.editor.commands.moveCurrentBlockUp(),
      "Alt-Shift-ArrowDown": () => this.editor.commands.moveCurrentBlockDown(),
      "Mod-Home": () => this.editor.commands.goToDocumentStart(),
      "Mod-End": () => this.editor.commands.goToDocumentEnd(),
    };
  },
});
