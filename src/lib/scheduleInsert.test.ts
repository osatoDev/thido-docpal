// @vitest-environment happy-dom
import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { readDays } from "@/lib/documentDays";
import { dayPlanText, insertScheduledTask, moveTaskToDay, scheduledTaskText, taskTime } from "@/lib/scheduleInsert";

const editors: Editor[] = [];
function make(content: string) {
  const editor = new Editor({ element: document.createElement("div"), extensions: getEditorExtensions(), content });
  editors.push(editor);
  return editor;
}
afterEach(() => editors.splice(0).forEach(editor => editor.destroy()));

const day = (date: string, note = "") => `<div data-type="day-header" data-date="${date}"><time>x</time><span data-day-content>${note}</span></div>`;
const tasks = (...items: string[]) => `<ul data-type="taskList">${items.map(item => `<li data-type="taskItem" data-checked="false"><p>${item}</p></li>`).join("")}</ul>`;

function add(editor: Editor, date: string, task: string, time: string | null = null) {
  const tr = insertScheduledTask(editor.state, { date, task, time });
  expect(tr).not.toBeNull();
  editor.view.dispatch(tr!);
}

function taskTexts(editor: Editor) {
  const texts: string[] = [];
  editor.state.doc.descendants(node => { if (node.type.name === "taskItem") texts.push(node.firstChild!.textContent); });
  return texts;
}

describe("scheduled task insertion", () => {
  it("appends to the existing task list under the matching day", () => {
    const editor = make(day("2026-12-01") + tasks("Book trip") + day("2026-12-10") + tasks("Later"));
    add(editor, "2026-12-01", "Suspend phone bill");
    expect(taskTexts(editor)).toEqual(["Book trip", "Suspend phone bill", "Later"]);
    expect(readDays(editor.state.doc)).toHaveLength(2);
  });

  it("orders timed tasks by time within the day", () => {
    const editor = make(day("2026-12-01") + tasks("09:00 Gym", "18:00 Dinner"));
    add(editor, "2026-12-01", "Dentist", "15:00");
    expect(taskTexts(editor)).toEqual(["09:00 Gym", "15:00 Dentist", "18:00 Dinner"]);
  });

  it("creates a missing day in date order between existing days", () => {
    const editor = make(day("2026-11-30") + tasks("Target") + day("2026-12-10") + tasks("Later"));
    add(editor, "2026-12-01", "Journal");
    expect(readDays(editor.state.doc).map(d => d.date)).toEqual(["2026-11-30", "2026-12-01", "2026-12-10"]);
    expect(taskTexts(editor)).toEqual(["Target", "Journal", "Later"]);
    const order: string[] = [];
    editor.state.doc.forEach(node => order.push(node.type.name === "dayHeader" ? node.attrs.date : node.type.name));
    expect(order.slice(0, 5)).toEqual(["2026-11-30", "taskList", "2026-12-01", "taskList", "paragraph"]);
  });

  it("appends a new day at the end of an undated document", () => {
    const editor = make("<p>My plans</p>");
    add(editor, "2026-12-24", "Wrap presents");
    expect(readDays(editor.state.doc).map(d => d.date)).toEqual(["2026-12-24"]);
    expect(taskTexts(editor)).toEqual(["Wrap presents"]);
    expect(editor.state.doc.firstChild?.textContent).toBe("My plans");
  });

  it("adds a list after day notes that are not tasks", () => {
    const editor = make(day("2026-12-01") + "<p>Notes for the day</p><p></p>" + day("2026-12-02"));
    add(editor, "2026-12-01", "Call bank");
    const names: string[] = [];
    editor.state.doc.forEach(node => names.push(node.type.name));
    expect(names.slice(0, 3)).toEqual(["dayHeader", "paragraph", "taskList"]);
  });

  it("rejects invalid dates and empty tasks", () => {
    const editor = make("<p></p>");
    expect(insertScheduledTask(editor.state, { date: "2026-02-30", task: "x", time: null })).toBeNull();
    expect(insertScheduledTask(editor.state, { date: "2026-02-03", task: "  ", time: null })).toBeNull();
  });

  it("is undoable in one step", () => {
    const editor = make("<p>Start</p>");
    add(editor, "2026-12-24", "Wrap presents");
    editor.commands.undo();
    expect(readDays(editor.state.doc)).toHaveLength(0);
  });
});

describe("task text helpers", () => {
  it("prefixes valid times and reads them back", () => {
    expect(scheduledTaskText({ task: "  Dentist  visit ", time: "15:00" })).toBe("15:00 Dentist visit");
    expect(scheduledTaskText({ task: "Dentist", time: "25:00" })).toBe("Dentist");
    expect(taskTime("07:30 Run")).toBe("07:30");
    expect(taskTime("Run at 07:30")).toBeNull();
  });

  it("summarises a day's plan with nesting and completion", () => {
    const editor = make(day("2026-11-30", "Big day") + `<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Target</p></li><li data-type="taskItem" data-checked="false"><p>Put on sale</p>${tasks("The washer")}</li></ul>`);
    expect(dayPlanText(editor.state.doc, "2026-11-30")).toBe("Day note: Big day\n[x] Target\n[ ] Put on sale\n  [ ] The washer");
    expect(dayPlanText(editor.state.doc, "2026-12-01")).toBeNull();
  });
});

describe("dayAtPosition", () => {
  it("finds the day section around a position", async () => {
    const { dayAtPosition } = await import("@/lib/scheduleInsert");
    const editor = make("<p>Intro</p>" + day("2026-12-01") + tasks("A") + day("2026-12-02") + tasks("B"));
    expect(dayAtPosition(editor.state.doc, 1)).toBeNull();
    let position = 0;
    editor.state.doc.descendants((node, pos) => { if (node.isText && node.text === "A") position = pos; });
    expect(dayAtPosition(editor.state.doc, position)).toBe("2026-12-01");
    expect(dayAtPosition(editor.state.doc, editor.state.doc.content.size)).toBe("2026-12-02");
  });
});

describe("moving a task to another day", () => {
  function itemPosition(editor: Editor, text: string) {
    let found = -1;
    editor.state.doc.descendants((node, pos) => {
      if (found === -1 && node.type.name === "taskItem" && node.firstChild?.textContent === text) found = pos;
    });
    return found;
  }
  function move(editor: Editor, text: string, date: string) {
    const tr = moveTaskToDay(editor.state, itemPosition(editor, text), date);
    expect(tr).not.toBeNull();
    editor.view.dispatch(tr!);
  }

  it("moves a task into the other day's list in time order, keeping its checked state and subtasks", () => {
    const editor = make(day("2026-11-07") + `<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>12:00 Prep</p>${tasks("Read site")}</li><li data-type="taskItem" data-checked="false"><p>Gym</p></li></ul>` + day("2026-11-08") + tasks("09:00 Oatmeal", "15:00 Match"));
    move(editor, "12:00 Prep", "2026-11-08");
    expect(dayPlanText(editor.state.doc, "2026-11-07")).toBe("[ ] Gym");
    expect(dayPlanText(editor.state.doc, "2026-11-08")).toBe("[ ] 09:00 Oatmeal\n[x] 12:00 Prep\n  [ ] Read site\n[ ] 15:00 Match");
  });

  it("removes the old list when its last task leaves, and creates a missing day", () => {
    const editor = make(day("2026-11-07") + tasks("Call mum") + day("2026-11-09"));
    move(editor, "Call mum", "2026-11-08");
    expect(dayPlanText(editor.state.doc, "2026-11-07")).toBe("");
    expect(readDays(editor.state.doc).map(day => day.date)).toEqual(["2026-11-07", "2026-11-08", "2026-11-09"]);
    expect(dayPlanText(editor.state.doc, "2026-11-08")).toBe("[ ] Call mum");
    editor.commands.undo();
    expect(dayPlanText(editor.state.doc, "2026-11-07")).toBe("[ ] Call mum");
  });

  it("refuses anything that is not a task item", () => {
    const editor = make(day("2026-11-07") + "<p>Note</p>");
    expect(moveTaskToDay(editor.state, 0, "2026-11-08")).toBeNull();
  });
});
