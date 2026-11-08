// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getEditorExtensions } from "@/lib/editorExtensions";
import {
  addProject,
  deleteProject,
  normalizeProjects,
  projectTasks,
  readProjects,
  renameProject,
  setTaskProject,
} from "@/lib/planProjects";
import { moveTaskToDay } from "@/lib/scheduleInsert";
import { preserveDocumentPreferences } from "@/lib/markdownToTiptap";

const editors: Editor[] = [];
function make() {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: getEditorExtensions(),
    content: {
      type: "doc",
      content: [
        { type: "dayHeader", attrs: { date: "2026-11-10" } },
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Pack kitchen" }] }] },
            { type: "taskItem", attrs: { checked: true }, content: [{ type: "paragraph", content: [{ type: "text", text: "Gym" }] }] },
          ],
        },
        { type: "dayHeader", attrs: { date: "2026-11-11" } },
        {
          type: "taskList",
          content: [
            { type: "taskItem", attrs: { checked: false }, content: [{ type: "paragraph", content: [{ type: "text", text: "Book movers" }] }] },
          ],
        },
      ],
    },
  });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

function taskPosition(editor: Editor, text: string) {
  let found = -1;
  editor.state.doc.descendants((node, position) => {
    if (node.type.name === "taskItem" && node.firstChild?.textContent === text) found = position;
  });
  return found;
}

function addNamed(editor: Editor, name: string, id: string) {
  const added = addProject(editor.state, name, id)!;
  if (added.tr) editor.view.dispatch(added.tr);
  return added.project;
}

function tag(editor: Editor, text: string, id: string | null) {
  editor.view.dispatch(setTaskProject(editor.state, taskPosition(editor, text), id)!);
}

describe("plan projects", () => {
  it("adds projects once by name and lists their tasks across days", () => {
    const editor = make();
    const move = addNamed(editor, "  Home   move ", "move");
    expect(move).toEqual({ id: "move", name: "Home move" });
    expect(addProject(editor.state, "home move")).toEqual({ tr: null, project: move });
    expect(addProject(editor.state, "   ")).toBeNull();

    tag(editor, "Pack kitchen", "move");
    tag(editor, "Book movers", "move");
    expect(projectTasks(editor.state.doc, "move")).toEqual([
      expect.objectContaining({ text: "Pack kitchen", checked: false, date: "2026-11-10" }),
      expect.objectContaining({ text: "Book movers", checked: false, date: "2026-11-11" }),
    ]);
  });

  it("only tags tasks with a known project and survives a reload", () => {
    const editor = make();
    expect(setTaskProject(editor.state, taskPosition(editor, "Gym"), "missing")).toBeNull();
    addNamed(editor, "Health", "health");
    tag(editor, "Gym", "health");

    const reloaded = new Editor({ element: document.createElement("div"), extensions: getEditorExtensions(), content: editor.getHTML() });
    editors.push(reloaded);
    expect(readProjects(reloaded.state.doc)).toEqual([{ id: "health", name: "Health" }]);
    expect(projectTasks(reloaded.state.doc, "health").map(task => task.text)).toEqual(["Gym"]);
  });

  it("keeps the project when a task moves to another day, but not on a split", () => {
    const editor = make();
    addNamed(editor, "Home move", "move");
    tag(editor, "Pack kitchen", "move");
    editor.view.dispatch(moveTaskToDay(editor.state, taskPosition(editor, "Pack kitchen"), "2026-11-12")!);
    expect(projectTasks(editor.state.doc, "move")).toEqual([
      expect.objectContaining({ text: "Pack kitchen", date: "2026-11-12" }),
    ]);

    const end = taskPosition(editor, "Pack kitchen") + 2 + "Pack kitchen".length;
    editor.chain().setTextSelection(end).splitListItem("taskItem").insertContent("Label boxes").run();
    expect(projectTasks(editor.state.doc, "move").map(task => task.text)).toEqual(["Pack kitchen"]);
  });

  it("renames, and deleting a project untags its tasks without removing them", () => {
    const editor = make();
    addNamed(editor, "Home move", "move");
    addNamed(editor, "Health", "health");
    tag(editor, "Book movers", "move");
    expect(renameProject(editor.state, "move", "health")).toBeNull();
    editor.view.dispatch(renameProject(editor.state, "move", "Moving house")!);
    expect(readProjects(editor.state.doc).map(project => project.name)).toEqual(["Moving house", "Health"]);

    editor.view.dispatch(deleteProject(editor.state, "move")!);
    expect(readProjects(editor.state.doc)).toEqual([{ id: "health", name: "Health" }]);
    expect(editor.state.doc.nodeAt(taskPosition(editor, "Book movers"))?.attrs.project).toBeNull();
    expect(editor.state.doc.textContent).toContain("Book movers");
  });

  it("drops malformed entries and keeps the list through AI rewrites", () => {
    expect(normalizeProjects([{ id: "a", name: "A" }, { id: "a", name: "Dup" }, { id: "", name: "x" }, { id: "b" }, null])).toEqual([{ id: "a", name: "A" }]);
    const kept = preserveDocumentPreferences(
      { type: "doc", content: [{ type: "planProjects", attrs: { projects: [{ id: "a", name: "A" }] } }, { type: "paragraph" }] },
      { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "New" }] }] },
    );
    expect(kept.content?.map(node => node.type)).toEqual(["planProjects", "paragraph"]);
  });
});
