// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { daysForExport, hasDayHeaders, readDays, validDay } from "@/lib/documentDays";

const editors: Editor[] = [];
function make(content = "<p>Daily tasks</p>") {
  const editor = new Editor({ element: document.createElement("div"), extensions: getEditorExtensions(), content });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

describe("day sections", () => {
  it("runs /day on Enter only at the start of a line and removes the command when applied", () => {
    const editor = make("<p>/day tomorrow</p>");
    let requested = 0;
    editor.view.dom.addEventListener("thido:format-day", () => { requested += 1; });
    editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize - 1);
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    editor.view.someProp("handleKeyDown", handler => handler(editor.view, event));
    expect(requested).toBe(1);
    expect(editor.state.doc.textContent).toBe("/day tomorrow");
    editor.commands.setDayHeader("2026-10-12");
    expect(editor.state.doc.textContent).toBe("");
    expect(editor.state.doc.childCount).toBe(1);
    expect(editor.getHTML()).toContain("Oct 12 Mon");
    editor.commands.undo();
    expect(editor.state.doc.textContent).toBe("/day tomorrow");
    editor.commands.setContent("<p>Use /day</p>");
    editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize - 1);
    editor.view.someProp("handleKeyDown", handler => handler(editor.view, event));
    expect(requested).toBe(1);
  });

  it("detects whether any day exists, including undo and reload", () => {
    const editor = make("<h1>A normal heading</h1><p>Text</p>");
    expect(hasDayHeaders(editor.state.doc)).toBe(false);
    editor.commands.setDayHeader("2026-10-11");
    expect(hasDayHeaders(editor.state.doc)).toBe(true);
    const restored = make(editor.getHTML());
    expect(hasDayHeaders(restored.state.doc)).toBe(true);
    editor.commands.undo();
    expect(hasDayHeaders(editor.state.doc)).toBe(false);
    editor.commands.redo();
    expect(hasDayHeaders(editor.state.doc)).toBe(true);
    editor.commands.setParagraph();
    expect(hasDayHeaders(editor.state.doc)).toBe(false);
  });
  it("replaces the current line with a formatted date, round-trips HTML and JSON, and supports undo", () => {
    const editor = make();
    expect(editor.commands.setDayHeader("2026-10-11")).toBe(true);
    expect(editor.state.doc.firstChild?.type.name).toBe("dayHeader");
    expect(editor.state.doc.firstChild?.textContent).toBe("");
    expect(editor.state.doc.childCount).toBe(1);
    expect(editor.getHTML()).toContain("Oct 11 Sun");
    const restored = make(editor.getHTML());
    expect(restored.getJSON()).toEqual(editor.getJSON());
    restored.commands.setContent(editor.getJSON());
    expect(readDays(restored.state.doc)[0]).toMatchObject({ date: "2026-10-11", week: 2, position: 0 });
    editor.commands.undo();
    expect(editor.state.doc.firstChild?.type.name).toBe("paragraph");
    expect(editor.state.doc.textContent).toBe("Daily tasks");
  });
  it("changes a date without adding lines and removes day formatting with Normal text", () => {
    const editor = make();
    editor.commands.setDayHeader("2026-10-11");
    editor.commands.setDayHeader("2027-01-01");
    expect(readDays(editor.state.doc)[0]).toMatchObject({ date: "2027-01-01", text: "" });
    editor.commands.setParagraph();
    expect(readDays(editor.state.doc)).toEqual([]);
    expect(editor.state.doc.textContent).toBe("");
  });
  it("rejects impossible dates and nested list lines", () => {
    expect(validDay("2026-02-29")).toBe(false);
    expect(validDay("2028-02-29")).toBe(true);
    expect(validDay("2026-13-01")).toBe(false);
    const editor = make("<ul><li><p>Task</p></li></ul>");
    editor.commands.setTextSelection(3);
    expect(editor.commands.setDayHeader("2026-10-11")).toBe(false);
    expect(make().commands.setDayHeader("2026-02-30")).toBe(false);
  });
  it("groups month boundaries into weeks 1–5, keeps duplicate dates and sorts across years", () => {
    const editor = make();
    editor.commands.setContent({ type: "doc", content: ["2027-01-01", "2026-10-31", "2026-10-08", "2026-10-07", "2026-10-08"].map(date => ({ type: "dayHeader", attrs: { date } })) });
    const days = readDays(editor.state.doc);
    expect(days.map(day => day.week)).toEqual([1, 2, 2, 5, 1]);
    expect(days.map(day => day.year)).toEqual(["2026", "2026", "2026", "2026", "2027"]);
    for (const day of days) {
      editor.commands.setTextSelection(day.position + 1);
      expect(editor.state.selection.$from.parent.attrs.date).toBe(day.date);
    }
  });
  it("Enter starts a normal paragraph after a day and leaves the date intact", () => {
    const editor = make();
    editor.commands.setDayHeader("2026-10-11");
    editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize - 1);
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    editor.view.someProp("handleKeyDown", handler => handler(editor.view, event));
    expect(editor.state.doc.child(0).type.name).toBe("dayHeader");
    expect(editor.state.doc.child(1).type.name).toBe("paragraph");
    expect(editor.state.selection.$from.parent.type.name).toBe("paragraph");
  });
  it("includes date labels in Word and PDF export input without mutating saved content", () => {
    const editor = make();
    editor.commands.setDayHeader("2026-10-11");
    const json = editor.getJSON();
    expect(JSON.stringify(daysForExport(json))).toContain("Oct 11 Sun");
    expect(json.content?.[0].type).toBe("dayHeader");
  });
});
