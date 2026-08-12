import {
  Extension,
  type Editor,
  type NodeViewRendererProps,
} from "@tiptap/core";
import { TaskItem, TaskList } from "@tiptap/extension-list";
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

export const MovableTaskItem = TaskItem.extend({
  addNodeView() {
    const parentRenderer = this.parent?.();
    if (!parentRenderer) return null;

    return (props: NodeViewRendererProps) => {
      const nodeView = parentRenderer(props);
      const listItem = nodeView.dom as HTMLElement;
      const controls = document.createElement("span");
      let currentNode = props.node;

      controls.className = "task-item-move-controls";
      controls.contentEditable = "false";
      controls.setAttribute("aria-label", "Move checklist item");

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
      const upButton = createMoveButton("up", () => move("up"));
      const downButton = createMoveButton("down", () => move("down"));

      const updateControls = () => {
        const position =
          typeof props.getPos === "function" ? props.getPos() : undefined;
        const label = taskItemControlLabel(currentNode);
        upButton.ariaLabel = `Move checklist item up: ${label}`;
        downButton.ariaLabel = `Move checklist item down: ${label}`;
        upButton.disabled =
          typeof position !== "number" ||
          !canMoveTaskItem(props.editor.state, position, "up");
        downButton.disabled =
          typeof position !== "number" ||
          !canMoveTaskItem(props.editor.state, position, "down");
      };

      controls.append(upButton, downButton);
      listItem.insertBefore(controls, nodeView.contentDOM ?? null);
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
  const { $from } = editor.state.selection;

  if (!editor.isActive("taskItem")) return false;

  if ($from.parent.isTextblock && $from.parent.textContent.length === 0) {
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
