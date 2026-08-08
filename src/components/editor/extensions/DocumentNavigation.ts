import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    documentNavigation: {
      goToPreviousHeading: () => ReturnType;
      goToNextHeading: () => ReturnType;
    };
  }
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
    };
  },

  addKeyboardShortcuts() {
    return {
      "Alt-Shift-PageUp": () => this.editor.commands.goToPreviousHeading(),
      "Alt-Shift-PageDown": () => this.editor.commands.goToNextHeading(),
      "Alt-Shift-ArrowUp": () => this.editor.commands.moveCurrentBlockUp(),
      "Alt-Shift-ArrowDown": () => this.editor.commands.moveCurrentBlockDown(),
    };
  },
});
