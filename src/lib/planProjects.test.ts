// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { addProject, readProjects } from "@/lib/planProjects";
import { dayAtPosition, dayPlanText, insertScheduledTask } from "@/lib/scheduleInsert";
import { dailyPlanSummary } from "@/lib/dailyPlanEmail";

const editors: Editor[] = [];
function make(content: object | string = { type: "doc", content: [
  { type: "dayHeader", attrs: { date: "2026-11-10" } },
  { type: "taskList", content: [task("Gym")] },
] }) {
  const editor = new Editor({ element: document.createElement("div"), extensions: getEditorExtensions(), content });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

function task(text: string, checked = false) {
  return { type: "taskItem", attrs: { checked }, content: [{ type: "paragraph", ...(text ? { content: [{ type: "text", text }] } : {}) }] };
}

function typeTasks(editor: Editor, ...texts: string[]) {
  texts.forEach((text, index) => {
    if (index > 0) editor.commands.splitListItem("taskItem");
    editor.commands.insertContent(text);
  });
}

describe("project lists", () => {
  it("adds a project as its own list after the days, ready to type into", () => {
    const editor = make();
    editor.view.dispatch(addProject(editor.state, "  Home   move ")!);
    typeTasks(editor, "Order boxes", "Book movers");

    expect(readProjects(editor.state.doc)).toEqual([
      expect.objectContaining({ name: "Home move", open: 2, total: 2 }),
    ]);
    const types: string[] = [];
    editor.state.doc.forEach(node => types.push(node.type.name));
    expect(types.slice(0, 4)).toEqual(["dayHeader", "taskList", "projectHeader", "taskList"]);
    expect(addProject(editor.state, "   ")).toBeNull();
  });

  it("counts open and done tasks per project and ignores empty ones", () => {
    const editor = make({ type: "doc", content: [
      { type: "projectHeader", content: [{ type: "text", text: "Website" }] },
      { type: "taskList", content: [task("Pick a domain", true), task("Write copy"), task("")] },
      { type: "projectHeader", content: [{ type: "text", text: "Taxes" }] },
      { type: "paragraph" },
    ] });
    expect(readProjects(editor.state.doc).map(({ name, open, total }) => ({ name, open, total }))).toEqual([
      { name: "Website", open: 1, total: 2 },
      { name: "Taxes", open: 0, total: 0 },
    ]);
  });

  it("keeps project tasks off every day and puts new days before projects", () => {
    const editor = make();
    editor.view.dispatch(addProject(editor.state, "Home move")!);
    typeTasks(editor, "Order boxes");

    // A later day goes after the last day, not inside the project.
    editor.view.dispatch(insertScheduledTask(editor.state, { date: "2026-11-12", time: null, task: "Dentist" })!);
    const types: string[] = [];
    editor.state.doc.forEach(node => types.push(node.type.name));
    expect(types.slice(0, 5)).toEqual(["dayHeader", "taskList", "dayHeader", "taskList", "paragraph"]);
    expect(types.slice(5, 7)).toEqual(["projectHeader", "taskList"]);

    expect(dayPlanText(editor.state.doc, "2026-11-12")).toBe("[ ] Dentist");
    let boxes = -1;
    editor.state.doc.descendants((node, position) => { if (node.textContent === "Order boxes" && node.type.name === "taskItem") boxes = position; });
    expect(dayAtPosition(editor.state.doc, boxes)).toBeNull();

    const summary = dailyPlanSummary(editor.getJSON(), "2026-11-12");
    expect(summary.today.map(line => line.text)).toEqual(["Dentist"]);
  });

  it("starts a project's checklist on Enter after its name and survives a reload", () => {
    const editor = make({ type: "doc", content: [
      { type: "projectHeader", content: [{ type: "text", text: "Garden" }] },
    ] });
    editor.commands.setTextSelection(1 + "Garden".length);
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    editor.view.someProp("handleKeyDown", handler => handler(editor.view, event));
    editor.commands.insertContent("Plant bulbs");

    const reloaded = make(editor.getHTML());
    expect(readProjects(reloaded.state.doc)).toEqual([
      expect.objectContaining({ name: "Garden", open: 1, total: 1 }),
    ]);
  });

  it("still loads plans saved with the earlier project tags", () => {
    const editor = make({ type: "doc", content: [
      { type: "planProjects", attrs: { projects: [{ id: "a", name: "Old" }] } },
      { type: "dayHeader", attrs: { date: "2026-11-10" } },
      { type: "taskList", content: [{ ...task("Gym"), attrs: { checked: false, project: "a" } }] },
    ] });
    expect(editor.state.doc.textContent).toBe("Gym");
  });
});
