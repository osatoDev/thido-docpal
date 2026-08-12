import { Extension, type Editor } from "@tiptap/core";
import { TaskList } from "@tiptap/extension-list";

export const TASK_STYLES = ["plain", "strike"] as const;

export type TaskStyle = (typeof TASK_STYLES)[number];

export const DEFAULT_TASK_STYLE: TaskStyle = "strike";

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
