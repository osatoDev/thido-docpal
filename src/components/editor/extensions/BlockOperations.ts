import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  NodeSelection,
  TextSelection,
  type EditorState,
} from "@tiptap/pm/state";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    blockOperations: {
      duplicateCurrentBlock: () => ReturnType;
      moveCurrentBlockUp: () => ReturnType;
      moveCurrentBlockDown: () => ReturnType;
      insertParagraphAbove: () => ReturnType;
      insertParagraphBelow: () => ReturnType;
      selectCurrentBlock: () => ReturnType;
      deleteCurrentBlock: () => ReturnType;
      mergeCurrentBlockWithPrevious: () => ReturnType;
      mergeCurrentBlockWithNext: () => ReturnType;
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
  if (node.type.name === "documentPreferences" || node.type.name === "planProjects") return null;
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
          if (previous.type.name === "documentPreferences" || previous.type.name === "planProjects") return false;
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
      selectCurrentBlock:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          if (!block) return false;
          tr.setSelection(NodeSelection.create(tr.doc, block.position));
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      deleteCurrentBlock:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          const paragraph = state.schema.nodes.paragraph;
          if (!block || !paragraph) return false;
          tr.delete(block.position, block.position + block.node.nodeSize);
          const remainingContentBlocks = Array.from(
            { length: tr.doc.childCount },
            (_, index) => tr.doc.child(index),
          ).filter((node) => node.type.name !== "documentPreferences" && node.type.name !== "planProjects");
          if (remainingContentBlocks.length === 0) {
            tr.insert(tr.doc.content.size, paragraph.create());
          }
          tr.setSelection(
            TextSelection.near(
              tr.doc.resolve(Math.min(block.position + 1, tr.doc.content.size)),
            ),
          );
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      mergeCurrentBlockWithPrevious:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          if (!block || block.index === 0 || !block.node.isTextblock) {
            return false;
          }
          const previous = state.doc.child(block.index - 1);
          if (!previous.isTextblock || previous.type !== block.node.type) {
            return false;
          }
          const previousPosition = block.position - previous.nodeSize;
          const merged = previous.copy(
            previous.content.append(block.node.content),
          );
          tr.replaceWith(
            previousPosition,
            block.position + block.node.nodeSize,
            merged,
          );
          tr.setSelection(
            TextSelection.near(
              tr.doc.resolve(previousPosition + previous.nodeSize - 1),
            ),
          );
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
      mergeCurrentBlockWithNext:
        () =>
        ({ state, tr, dispatch }) => {
          const block = currentBlock(state);
          if (
            !block ||
            !block.node.isTextblock ||
            block.index >= state.doc.childCount - 1
          ) {
            return false;
          }
          const next = state.doc.child(block.index + 1);
          if (!next.isTextblock || next.type !== block.node.type) return false;
          const merged = block.node.copy(block.node.content.append(next.content));
          tr.replaceWith(
            block.position,
            block.position + block.node.nodeSize + next.nodeSize,
            merged,
          );
          tr.setSelection(
            TextSelection.near(
              tr.doc.resolve(block.position + block.node.nodeSize - 1),
            ),
          );
          if (dispatch) dispatch(tr.scrollIntoView());
          return true;
        },
    };
  },
});
