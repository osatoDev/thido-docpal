import { describe, expect, it } from "vitest";
import { dailyPlanSummary, isTimeZone, localDay, previousDay } from "@/lib/dailyPlanEmail";

const text = (value: string) => ({ type: "text", text: value });
const paragraph = (value: string) => ({ type: "paragraph", content: [text(value)] });
const day = (date: string, note = "") => ({ type: "dayHeader", attrs: { date }, content: note ? [text(note)] : [] });
const task = (value: string, checked = false, ...children: object[]) => ({
  type: "taskItem",
  attrs: { checked },
  content: [paragraph(value), ...(children.length ? [{ type: "taskList", content: children }] : [])],
});
const tasks = (...items: object[]) => ({ type: "taskList", content: items });

describe("daily plan email days", () => {
  it("uses the person's own calendar day", () => {
    const now = new Date("2026-11-08T05:20:00Z");
    expect(localDay(now, "Europe/Berlin")).toBe("2026-11-08");
    expect(localDay(now, "America/New_York")).toBe("2026-11-08");
    expect(localDay(now, "America/Los_Angeles")).toBe("2026-11-07");
    expect(localDay(now, "Not/AZone")).toBe("2026-11-08");
    expect(localDay(now, null)).toBe("2026-11-08");
  });

  it("validates time zones and steps back a day across months", () => {
    expect(isTimeZone("Europe/Berlin")).toBe(true);
    expect(isTimeZone("Mars/Base")).toBe(false);
    expect(isTimeZone("")).toBe(false);
    expect(previousDay("2026-12-01")).toBe("2026-11-30");
    expect(previousDay("2027-01-01")).toBe("2026-12-31");
  });
});

describe("daily plan summary", () => {
  const content = {
    type: "doc",
    content: [
      day("2026-11-07"),
      tasks(task("19:30 Dinner", true), task("Prep interview", false, task("Read site", true), task("Questions"))),
      paragraph("Felt good"),
      day("2026-11-08", "Sunday"),
      tasks(task("10:30 Oatmeal"), task("Park car", true)),
      { type: "bulletList", content: [{ type: "listItem", content: [paragraph("Bring charger")] }] },
      day("2026-11-09"),
      tasks(task("Monday thing")),
      day("2026-11-08"),
      tasks(task("15:00 Sunderland v Chelsea")),
    ],
  };

  it("lists today's lines, including a second header for the same day", () => {
    expect(dailyPlanSummary(content, "2026-11-08").today).toEqual([
      { text: "Sunday", checked: null, depth: 0 },
      { text: "10:30 Oatmeal", checked: false, depth: 0 },
      { text: "Park car", checked: true, depth: 0 },
      { text: "Bring charger", checked: null, depth: 0 },
      { text: "15:00 Sunderland v Chelsea", checked: false, depth: 0 },
    ]);
  });

  it("lists only what was ticked off yesterday, subtasks included", () => {
    expect(dailyPlanSummary(content, "2026-11-08").doneYesterday).toEqual([
      { text: "19:30 Dinner", checked: true, depth: 0 },
      { text: "Read site", checked: true, depth: 0 },
    ]);
  });

  it("copes with an empty or missing plan", () => {
    expect(dailyPlanSummary(null, "2026-11-08")).toEqual({ today: [], doneYesterday: [] });
    expect(dailyPlanSummary(content, "2026-12-25")).toEqual({ today: [], doneYesterday: [] });
  });
});
