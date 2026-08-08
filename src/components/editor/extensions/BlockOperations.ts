import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, type EditorState } from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockOperations: {
      duplicateCurrentBlock: () => ReturnType;
      moveCurrentBlockUp: () => ReturnType;
      moveCurrentBlockDown: () => ReturnType;
      insertParagraphAbove: () => ReturnType;
      insertParagraphBelow: () => ReturnType;
    };
  }
}

type BlockContext = {
  index: number;
  node: ProseMirrorNode;
  position: number;
};

function currentBlock(state: EditorState): BlockContext | null {
  const childCount = state.doc.childCount;
  if (childCount === 0) return null;
  const selectionIndex = state.selection.$from.index(0);
  const index = Math.min(selectionIndex, childCount - 1);
  const node = state.doc.child(index);
  if (node.type.name === "documentPreferences") return null;
  let position = 0;
  for (let childIndex = 0; childIndex < index; childIndex += 1) {
    position += state.doc.child(childIndex).nodeSize;
  }
  return { index, node, position };
}

export const BlockOperations = Extension.create({
  name: "blockOperations",

  addCommands() {
    return {
      duplicateCurrentBlock:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          if (!block) return false;
          const insertPosition = block.position + block.node.nodeSize;
          tr.insert(insertPosition, block.node.copy(block.node.content));
          tr.setSelection(
            TextSelection.near(tr.doc.resolve(insertPosition + 1)),
          );
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      moveCurrentBlockUp:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          if (!block || block.index === 0) return false;
          const previous = state.doc.child(block.index - 1);
          if (previous.type.name === "documentPreferences") return false;
          const newPosition = block.position - previous.nodeSize;
          const relativeSelection = Math.max(
            1,
            state.selection.from - block.position,
          );
          tr.delete(block.position, block.position + block.node.nodeSize);
          tr.insert(newPosition, block.node);
          tr.setSelection(
            TextSelection.near(
              tr.doc.resolve(
                Math.min(
                  newPosition + relativeSelection,
                  newPosition + block.node.nodeSize - 1,
                ),
              ),
            ),
          );
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      moveCurrentBlockDown:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          if (!block || block.index >= state.doc.childCount - 1) return false;
          const next = state.doc.child(block.index + 1);
          const relativeSelection = Math.max(
            1,
            state.selection.from - block.position,
          );
          tr.delete(block.position, block.position + block.node.nodeSize);
          const newPosition = block.position + next.nodeSize;
          tr.insert(newPosition, block.node);
          tr.setSelection(
            TextSelection.near(
              tr.doc.resolve(
                Math.min(
                  newPosition + relativeSelection,
                  newPosition + block.node.nodeSize - 1,
                ),
              ),
            ),
          );
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      insertParagraphAbove:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          const paragraph = state.schema.nodes.paragraph;
          if (!block || !paragraph) return false;
          tr.insert(block.position, paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, block.position + 1));
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      insertParagraphBelow:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          const paragraph = state.schema.nodes.paragraph;
          if (!block || !paragraph) return false;
          const insertPosition = block.position + block.node.nodeSize;
          tr.insert(insertPosition, paragraph.create());
          tr.setSelection(TextSelection.create(tr.doc, insertPosition + 1));
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
    };
  },
});
