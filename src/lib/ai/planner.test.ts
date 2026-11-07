import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/client", () => ({ anthropic: {} }));

const { normalizeScheduleEntry } = await import("@/lib/ai/planner");

describe("schedule entry normalisation", () => {
  it("keeps valid dates and times", () => {
    expect(normalizeScheduleEntry({ date: "2026-12-01", time: "15:00", task: "Dentist", clarification: null }, "dentist 3pm"))
      .toEqual({ ok: true, date: "2026-12-01", time: "15:00", task: "Dentist" });
  });

  it("drops malformed times and falls back to the raw text for an empty task", () => {
    expect(normalizeScheduleEntry({ date: "2026-12-01", time: "3pm", task: " ", clarification: null }, "call mum"))
      .toEqual({ ok: true, date: "2026-12-01", time: null, task: "call mum" });
  });

  it("asks for clarification when the date is missing or invalid", () => {
    expect(normalizeScheduleEntry({ date: null, time: null, task: "x", clarification: "Which Tuesday?" }, "x"))
      .toEqual({ ok: false, clarification: "Which Tuesday?" });
    expect(normalizeScheduleEntry({ date: "2026-02-30", time: null, task: "x", clarification: null }, "x"))
      .toEqual({ ok: false, clarification: "Which day should this go on?" });
  });
});
