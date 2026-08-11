import { Extension } from "@tiptap/core";
import { TaskList } from "@tiptap/extension-list";

export const TASK_STYLES = ["plain", "strike"] as const;

export type TaskStyle = (typeof TASK_STYLES)[number];

export const DEFAULT_TASK_STYLE: TaskStyle = "strike";

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
      Tab: () => this.editor.commands.sinkListItem("taskItem"),
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
