import { Extension, Node } from "@tiptap/core";

/**
 * Legacy: an earlier version tagged day tasks with projects and kept the list
 * in this hidden node. Projects are now their own sections (ProjectHeader), but
 * plans saved back then still hold this node and attribute, and an unknown
 * node type would stop them loading. Both stay in the schema with no UI.
 */
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
            const value: unknown = JSON.parse(element.getAttribute("data-projects") ?? "[]");
            return Array.isArray(value) ? value : [];
          } catch {
            return [];
          }
        },
        renderHTML: (attributes: Record<string, unknown>) => ({
          "data-projects": JSON.stringify(Array.isArray(attributes.projects) ? attributes.projects : []),
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
