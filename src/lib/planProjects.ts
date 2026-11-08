import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { EditorState, Transaction } from "@tiptap/pm/state";
import { dayAtPosition } from "@/lib/scheduleInsert";

export type PlanProject = { id: string; name: string };
export type ProjectTask = {
  position: number;
  text: string;
  checked: boolean;
  date: string | null;
};

export const PROJECT_NAME_MAX_LENGTH = 60;

export function normalizeProjects(value: unknown): PlanProject[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const projects: PlanProject[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { id, name } = entry as Record<string, unknown>;
    if (typeof id !== "string" || !id || seen.has(id)) continue;
    const clean = cleanProjectName(name);
    if (!clean) continue;
    seen.add(id);
    projects.push({ id, name: clean });
  }
  return projects;
}

export function cleanProjectName(name: unknown) {
  return typeof name === "string"
    ? name.replace(/\s+/g, " ").trim().slice(0, PROJECT_NAME_MAX_LENGTH)
    : "";
}

function findProjectsNode(doc: ProseMirrorNode) {
  let found: { node: ProseMirrorNode; position: number } | null = null;
  doc.descendants((node, position) => {
    if (found) return false;
    if (node.type.name === "planProjects") {
      found = { node, position };
      return false;
    }
  });
  return found as { node: ProseMirrorNode; position: number } | null;
}

export function readProjects(doc: ProseMirrorNode): PlanProject[] {
  return normalizeProjects(findProjectsNode(doc)?.node.attrs.projects);
}

function writeProjects(state: EditorState, projects: PlanProject[], tr = state.tr) {
  const existing = findProjectsNode(tr.doc);
  if (existing) {
    tr.setNodeMarkup(existing.position, undefined, { ...existing.node.attrs, projects });
  } else {
    const node = state.schema.nodes.planProjects?.create({ projects });
    if (!node) return null;
    tr.insert(0, node);
  }
  return tr;
}

function newProjectId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Adds a project, or returns the existing one with the same name. */
export function addProject(
  state: EditorState,
  name: string,
  id = newProjectId(),
): { tr: Transaction | null; project: PlanProject } | null {
  const clean = cleanProjectName(name);
  if (!clean) return null;
  const projects = readProjects(state.doc);
  const existing = projects.find(project => project.name.toLowerCase() === clean.toLowerCase());
  if (existing) return { tr: null, project: existing };
  const project = { id, name: clean };
  const tr = writeProjects(state, [...projects, project]);
  return tr ? { tr, project } : null;
}

export function renameProject(state: EditorState, id: string, name: string) {
  const clean = cleanProjectName(name);
  const projects = readProjects(state.doc);
  if (!clean || !projects.some(project => project.id === id)) return null;
  if (projects.some(project => project.id !== id && project.name.toLowerCase() === clean.toLowerCase())) return null;
  return writeProjects(state, projects.map(project => project.id === id ? { ...project, name: clean } : project));
}

/** Removes a project and takes it off every task; the tasks themselves stay. */
export function deleteProject(state: EditorState, id: string) {
  const projects = readProjects(state.doc);
  if (!projects.some(project => project.id === id)) return null;
  const tr = state.tr;
  state.doc.descendants((node, position) => {
    if (node.type.name === "taskItem" && node.attrs.project === id) {
      tr.setNodeMarkup(position, undefined, { ...node.attrs, project: null });
    }
  });
  return writeProjects(state, projects.filter(project => project.id !== id), tr);
}

export function setTaskProject(state: EditorState, position: number, id: string | null) {
  const node = state.doc.nodeAt(position);
  if (node?.type.name !== "taskItem") return null;
  if (id !== null && !readProjects(state.doc).some(project => project.id === id)) return null;
  return state.tr.setNodeMarkup(position, undefined, { ...node.attrs, project: id });
}

/** Every task in a project, in document order, with the day it sits under. */
export function projectTasks(doc: ProseMirrorNode, id: string): ProjectTask[] {
  const tasks: ProjectTask[] = [];
  doc.descendants((node, position) => {
    if (node.type.name !== "taskItem" || node.attrs.project !== id) return;
    tasks.push({
      position,
      text: (node.firstChild?.textContent ?? "").trim(),
      checked: node.attrs.checked === true,
      date: dayAtPosition(doc, position),
    });
  });
  return tasks;
}
