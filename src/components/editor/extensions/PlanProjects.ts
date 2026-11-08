import { Extension, Node } from "@tiptap/core";
import { normalizeProjects } from "@/lib/planProjects";

/** Hidden block that holds the plan's project list, so it saves with the plan. */
export const PlanProjectsNode = Node.create({
  name: "planProjects",
  group: "block",
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      projects: {
        default: [],
        parseHTML: (element: HTMLElement) => {
          try {
            return normalizeProjects(JSON.parse(element.getAttribute("data-projects") ?? "[]"));
          } catch {
            return [];
          }
        },
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-projects": JSON.stringify(normalizeProjects(attributes.projects)),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="plan-projects"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", { ...HTMLAttributes, "data-type": "plan-projects", hidden: "hidden" }];
  },
});

/** A task's project id. A new task made by pressing Enter starts without one. */
export const TaskProjectAttribute = Extension.create({
  name: "taskProjectAttribute",

  addGlobalAttributes() {
    return [
      {
        types: ["taskItem"],
        attributes: {
          project: {
            default: null,
            keepOnSplit: false,
            parseHTML: (element: HTMLElement) => element.getAttribute("data-project") || null,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.project === "string" && attributes.project
                ? { "data-project": attributes.project }
                : {},
          },
        },
      },
    ];
  },
});
