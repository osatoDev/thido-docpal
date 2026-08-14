import {
  Extension,
  type Editor,
  type NodeViewRendererProps,
} from "@tiptap/core";
import { TaskItem, TaskList, type TaskItemOptions } from "@tiptap/extension-list";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import {
  TextSelection,
  type EditorState,
  type Transaction,
} from "@tiptap/pm/state";

export const TASK_STYLES = ["plain", "strike"] as const;

export type TaskStyle = (typeof TASK_STYLES)[number];

export const DEFAULT_TASK_STYLE: TaskStyle = "strike";
const TASK_ITEM_MOVE_META = "taskItemMovement";

export type TaskItemMoveDirection = "up" | "down";

type TaskItemMoveContext = {
  index: number;
  item: ProseMirrorNode;
  itemCount: number;
  parent: ProseMirrorNode;
};

function taskItemMoveContext(
  state: EditorState,
  position: number,
): TaskItemMoveContext | null {
  if (!Number.isInteger(position) || position < 0) return null;
  const item = state.doc.nodeAt(position);
  if (item?.type.name !== "taskItem") return null;

  const resolved = state.doc.resolve(position);
  if (resolved.parent.type.name !== "taskList") return null;
  const index = resolved.index();
  if (resolved.parent.child(index) !== item) return null;

  return {
    index,
    item,
    itemCount: resolved.parent.childCount,
    parent: resolved.parent,
  };
}

export function canMoveTaskItem(
  state: EditorState,
  position: number,
  direction: TaskItemMoveDirection,
) {
  const context = taskItemMoveContext(state, position);
  if (!context) return false;
  return direction === "up"
    ? context.index > 0
    : context.index < context.itemCount - 1;
}

export function moveTaskItem(
  state: EditorState,
  dispatch: ((transaction: Transaction) => void) | undefined,
  position: number,
  direction: TaskItemMoveDirection,
) {
  const context = taskItemMoveContext(state, position);
  if (!context) return false;
  const canMove =
    direction === "up"
      ? context.index > 0
      : context.index < context.itemCount - 1;
  if (!canMove) return false;

  if (dispatch) {
    const sibling =
      direction === "up"
        ? context.parent.child(context.index - 1)
        : context.parent.child(context.index + 1);
    const nextPosition =
      direction === "up"
        ? position - sibling.nodeSize
        : position + sibling.nodeSize;
    const selectionInsideItem =
      state.selection.from > position &&
      state.selection.from < position + context.item.nodeSize;
    const selectionOffset = selectionInsideItem
      ? state.selection.from - position
      : 1;
    const transaction = state.tr
      .delete(position, position + context.item.nodeSize)
      .insert(nextPosition, context.item);
    transaction.setMeta(TASK_ITEM_MOVE_META, true);
    transaction.setSelection(
      TextSelection.near(
        transaction.doc.resolve(
          Math.min(
            nextPosition + selectionOffset,
            nextPosition + context.item.nodeSize - 1,
          ),
        ),
      ),
    );
    dispatch(transaction.scrollIntoView());
  }

  return true;
}

/**
 * Deletes a checklist item. When it is the only item in its list, the whole
 * list is removed instead so the taskList node never ends up with zero
 * children (its schema requires at least one taskItem).
 */
export function deleteTaskItem(
  state: EditorState,
  dispatch: ((transaction: Transaction) => void) | undefined,
  position: number,
) {
  const context = taskItemMoveContext(state, position);
  if (!context) return false;

  if (dispatch) {
    let transaction: Transaction;
    if (context.itemCount <= 1) {
      const resolved = state.doc.resolve(position);
      const listStart = resolved.before(resolved.depth);
      const listEnd = listStart + resolved.node(resolved.depth).nodeSize;
      transaction = state.tr.delete(listStart, listEnd);
    } else {
      transaction = state.tr.delete(position, position + context.item.nodeSize);
    }
    transaction.setMeta(TASK_ITEM_MOVE_META, true);
    dispatch(transaction.scrollIntoView());
  }

  return true;
}

function taskItemControlLabel(node: ProseMirrorNode) {
  const text = (node.firstChild?.textContent ?? node.textContent)
    .replace(/\s+/g, " ")
    .trim();
  return text ? text.slice(0, 80) : "empty item";
}

function createMoveButton(
  direction: TaskItemMoveDirection,
  onMove: () => void,
) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "task-item-move-button";
  button.textContent = direction === "up" ? "↑" : "↓";
  button.title = `Move checklist item ${direction}`;
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", onMove);
  return button;
}

function createDeleteButton(onDelete: () => void) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "task-item-delete-button";
  button.textContent = "×";
  button.title = "Delete checklist item";
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", onDelete);
  return button;
}

export type MovableTaskItemOptions = TaskItemOptions & {
  showMoveControls: boolean;
};

export const MovableTaskItem = TaskItem.extend<MovableTaskItemOptions>({
  addOptions() {
    return {
      ...this.parent?.(),
      showMoveControls: true,
    } as MovableTaskItemOptions;
  },
  addNodeView() {
    const parentRenderer = this.parent?.();
    if (!parentRenderer) return null;

    return (props: NodeViewRendererProps) => {
      const nodeView = parentRenderer(props);
      const listItem = nodeView.dom as HTMLElement;
      const showMoveControls = this.options.showMoveControls !== false;
      const controls = document.createElement("span");
      let currentNode = props.node;

      controls.className = "task-item-move-controls";
      controls.contentEditable = "false";
      controls.setAttribute("aria-label", "Checklist item actions");

      const move = (direction: TaskItemMoveDirection) => {
        if (!props.editor.isEditable || typeof props.getPos !== "function") {
          return;
        }
        const position = props.getPos();
        if (typeof position !== "number") return;
        if (
          moveTaskItem(
            props.editor.state,
            props.editor.view.dispatch,
            position,
            direction,
          )
        ) {
          props.editor.view.focus();
        }
      };
      const remove = () => {
        if (!props.editor.isEditable || typeof props.getPos !== "function") {
          return;
        }
        const position = props.getPos();
        if (typeof position !== "number") return;
        if (
          deleteTaskItem(props.editor.state, props.editor.view.dispatch, position)
        ) {
          props.editor.view.focus();
        }
      };
      const upButton = showMoveControls
        ? createMoveButton("up", () => move("up"))
        : null;
      const downButton = showMoveControls
        ? createMoveButton("down", () => move("down"))
        : null;
      const deleteButton = createDeleteButton(remove);

      const updateControls = () => {
        const position =
          typeof props.getPos === "function" ? props.getPos() : undefined;
        const label = taskItemControlLabel(currentNode);
        if (upButton && downButton) {
          upButton.ariaLabel = `Move checklist item up: ${label}`;
          downButton.ariaLabel = `Move checklist item down: ${label}`;
          upButton.disabled =
            typeof position !== "number" ||
            !canMoveTaskItem(props.editor.state, position, "up");
          downButton.disabled =
            typeof position !== "number" ||
            !canMoveTaskItem(props.editor.state, position, "down");
        }
        deleteButton.ariaLabel = `Delete checklist item: ${label}`;
        deleteButton.hidden = currentNode.attrs.checked !== true;
      };

      if (upButton) controls.append(upButton);
      if (downButton) controls.append(downButton);
      controls.append(deleteButton);
      listItem.insertBefore(controls, listItem.firstChild);
      updateControls();
      const refreshAfterMovement = ({
        transaction,
      }: {
        transaction: Transaction;
      }) => {
        if (transaction.getMeta(TASK_ITEM_MOVE_META)) updateControls();
      };
      props.editor.on("transaction", refreshAfterMovement);

      const parentUpdate = nodeView.update?.bind(nodeView);
      const parentDestroy = nodeView.destroy?.bind(nodeView);
      return {
        ...nodeView,
        update(updatedNode, decorations, innerDecorations) {
          const updated = parentUpdate
            ? parentUpdate(updatedNode, decorations, innerDecorations)
            : updatedNode.type === props.node.type;
          if (!updated) return false;
          currentNode = updatedNode;
          updateControls();
          return true;
        },
        destroy() {
          props.editor.off("transaction", refreshAfterMovement);
          parentDestroy?.();
        },
      };
    };
  },
});

function insertTabOrIndentEmptyTaskItem(editor: Editor) {
  const { $from, empty } = editor.state.selection;

  if (!editor.isActive("taskItem")) return false;

  // A range selection indents every checklist item it touches (one or
  // several) rather than replacing the selected text with a literal tab.
  if (!empty) {
    return editor.commands.sinkListItem("taskItem");
  }

  if ($from.parent.isTextblock && $from.parentOffset === 0) {
    return editor.commands.sinkListItem("taskItem");
  }

  return editor.commands.insertContent("\t");
}

export function isTaskStyle(value: unknown): value is TaskStyle {
  return (
    typeof value === "string" && TASK_STYLES.includes(value as TaskStyle)
  );
}

export const TaskItemIndentation = Extension.create({
  name: "taskItemIndentation",
  priority: 110,

  addKeyboardShortcuts() {
    return {
      Tab: () => insertTabOrIndentEmptyTaskItem(this.editor),
      "Shift-Tab": () => this.editor.commands.liftListItem("taskItem"),
    };
  },
});

export const StyledTaskList = TaskList.extend({
  addAttributes() {
    return {
      taskStyle: {
        default: DEFAULT_TASK_STYLE,
        parseHTML: (element) => {
          const value = element.getAttribute("data-task-style");
          return isTaskStyle(value) ? value : DEFAULT_TASK_STYLE;
        },
        renderHTML: (attributes) => ({
          "data-task-style": isTaskStyle(attributes.taskStyle)
            ? attributes.taskStyle
            : DEFAULT_TASK_STYLE,
        }),
      },
    };
  },
});
