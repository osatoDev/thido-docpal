import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/client", () => ({ anthropic: {} }));

const { normalizeScheduleEntry } = await import("@/lib/ai/planner");

describe("schedule entry normalisation", () => {
  it("keeps valid dates and times", () => {
    expect(normalizeScheduleEntry({ dates: ["2026-12-01"], time: "15:00", task: "Dentist", clarification: null }, "dentist 3pm"))
      .toEqual({ ok: true, dates: ["2026-12-01"], time: "15:00", task: "Dentist" });
  });

  it("keeps every day of a repeating task, sorted and without duplicates", () => {
    expect(normalizeScheduleEntry({ dates: ["2026-12-03", "2026-12-01", "2026-12-02", "2026-12-01"], time: "10:30", task: "Oatmeal", clarification: null }, "x"))
      .toEqual({ ok: true, dates: ["2026-12-01", "2026-12-02", "2026-12-03"], time: "10:30", task: "Oatmeal" });
  });

  it("caps a repeating task at 31 days", () => {
    const dates = Array.from({ length: 40 }, (_, day) => `2027-01-${String((day % 31) + 1).padStart(2, "0")}`)
      .concat(Array.from({ length: 9 }, (_, day) => `2027-02-0${day + 1}`));
    const result = normalizeScheduleEntry({ dates, time: null, task: "Walk", clarification: null }, "x");
    expect(result.ok && result.dates).toHaveLength(31);
  });

  it("drops malformed times and falls back to the raw text for an empty task", () => {
    expect(normalizeScheduleEntry({ dates: ["2026-12-01"], time: "3pm", task: " ", clarification: null }, "call mum"))
      .toEqual({ ok: true, dates: ["2026-12-01"], time: null, task: "call mum" });
  });

  it("asks for clarification when no valid date remains", () => {
    expect(normalizeScheduleEntry({ dates: [], time: null, task: "x", clarification: "Which Tuesday?" }, "x"))
      .toEqual({ ok: false, clarification: "Which Tuesday?" });
    expect(normalizeScheduleEntry({ dates: ["2026-02-30"], time: null, task: "x", clarification: null }, "x"))
      .toEqual({ ok: false, clarification: "Which day should this go on?" });
  });
});
