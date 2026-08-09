import { TaskList } from "@tiptap/extension-list";

export const TASK_STYLES = ["plain", "strike"] as const;

export type TaskStyle = (typeof TASK_STYLES)[number];

export function isTaskStyle(value: unknown): value is TaskStyle {
  return (
    typeof value === "string" && TASK_STYLES.includes(value as TaskStyle)
  );
}

export const StyledTaskList = TaskList.extend({
  addAttributes() {
    return {
      taskStyle: {
        default: "plain",
        parseHTML: (element) => {
          const value = element.getAttribute("data-task-style");
          return isTaskStyle(value) ? value : "plain";
        },
        renderHTML: (attributes) => ({
          "data-task-style": isTaskStyle(attributes.taskStyle)
            ? attributes.taskStyle
            : "plain",
        }),
      },
    };
  },
});
