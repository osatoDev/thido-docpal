import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";
import { bodyEnd, isProject, sectionMembers, topLevelBlocks } from "@/lib/scheduleInsert";

export type PlanProject = {
  /** Position of the project header. */
  position: number;
  name: string;
  open: number;
  total: number;
};

export const PROJECT_NAME_MAX_LENGTH = 60;

export function cleanProjectName(name: string) {
  return name.replace(/\s+/g, " ").trim().slice(0, PROJECT_NAME_MAX_LENGTH);
}

function countTasks(node: ProseMirrorNode) {
  let open = 0;
  let total = 0;
  node.descendants(child => {
    if (child.type.name !== "taskItem") return;
    if (!(child.firstChild?.textContent ?? "").trim()) return;
    total += 1;
    if (child.attrs.checked !== true) open += 1;
  });
  return { open, total };
}

/** Every project section in the plan, in document order, with its task counts. */
export function readProjects(doc: ProseMirrorNode): PlanProject[] {
  const blocks = topLevelBlocks(doc);
  const end = bodyEnd(blocks, doc);
  const projects: PlanProject[] = [];
  blocks.forEach((block, index) => {
    if (block.pos >= end || !isProject(block)) return;
    let open = 0;
    let total = 0;
    for (const member of sectionMembers(blocks, index, end)) {
      const counts = countTasks(member.node);
      open += counts.open;
      total += counts.total;
    }
    projects.push({ position: block.pos, name: block.node.textContent.trim(), open, total });
  });
  return projects;
}

/**
 * Adds a project section, with one empty task to type into, at the end of the
 * plan, and puts the cursor in that task. Returns null for an empty name or a
 * schema without projects.
 */
export function addProject(state: EditorState, name: string): Transaction | null {
  const clean = cleanProjectName(name);
  const { schema, doc } = state;
  if (!clean || !schema.nodes.projectHeader || !schema.nodes.taskList) return null;
  const header = schema.nodes.projectHeader.create(null, schema.text(clean));
  const list = schema.nodes.taskList.create(null,
    schema.nodes.taskItem.create({ checked: false }, schema.nodes.paragraph.create()));
  const insertAt = bodyEnd(topLevelBlocks(doc), doc);
  const tr = state.tr.insert(insertAt, [header, list]);
  // Inside the new task's paragraph: list, item and paragraph each open one level.
  tr.setSelection(TextSelection.near(tr.doc.resolve(insertAt + header.nodeSize + 3)));
  return tr.scrollIntoView();
}
