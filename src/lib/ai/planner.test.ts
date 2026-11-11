import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/client", () => ({ anthropic: {} }));

const { normalizeDailyEmailInsights, normalizePlanRequest, normalizeScheduleEntry } = await import("@/lib/ai/planner");

const TODAY = "2026-11-07";
const task = (fields: Partial<Parameters<typeof normalizeScheduleEntry>[0]>) => ({
  kind: "task" as const, dates: [], time: null, task: "", clarification: null, ...fields,
});

describe("schedule entry normalisation", () => {
  it("keeps valid dates and times", () => {
    expect(normalizeScheduleEntry(task({ dates: ["2026-12-01"], time: "15:00", task: "Dentist" }), "dentist 3pm", TODAY))
      .toEqual({ ok: true, kind: "task", dates: ["2026-12-01"], time: "15:00", task: "Dentist" });
  });

  it("keeps every day of a repeating task, sorted and without duplicates", () => {
    expect(normalizeScheduleEntry(task({ dates: ["2026-12-03", "2026-12-01", "2026-12-02", "2026-12-01"], time: "10:30", task: "Oatmeal" }), "x", TODAY))
      .toEqual({ ok: true, kind: "task", dates: ["2026-12-01", "2026-12-02", "2026-12-03"], time: "10:30", task: "Oatmeal" });
  });

  it("caps a repeating task at 31 days", () => {
    const dates = Array.from({ length: 40 }, (_, day) => `2027-01-${String((day % 31) + 1).padStart(2, "0")}`)
      .concat(Array.from({ length: 9 }, (_, day) => `2027-02-0${day + 1}`));
    const result = normalizeScheduleEntry(task({ dates, task: "Walk" }), "x", TODAY);
    expect(result.ok && result.kind === "task" && result.dates).toHaveLength(31);
  });

  it("drops malformed times and falls back to the raw text for an empty task", () => {
    expect(normalizeScheduleEntry(task({ dates: ["2026-12-01"], time: "3pm", task: " " }), "call mum", TODAY))
      .toEqual({ ok: true, kind: "task", dates: ["2026-12-01"], time: null, task: "call mum" });
  });

  it("asks for clarification when no valid date remains", () => {
    expect(normalizeScheduleEntry(task({ task: "x", clarification: "Which Tuesday?" }), "x", TODAY))
      .toEqual({ ok: false, clarification: "Which Tuesday?" });
    expect(normalizeScheduleEntry(task({ dates: ["2026-02-30"], task: "x" }), "x", TODAY))
      .toEqual({ ok: false, clarification: "Which day should this go on?" });
  });

  it("treats a request as being about its day, or today", () => {
    expect(normalizeScheduleEntry(task({ kind: "request", dates: ["2026-11-08"] }), "x", TODAY))
      .toEqual({ ok: true, kind: "request", date: "2026-11-08" });
    expect(normalizeScheduleEntry(task({ kind: "request" }), "x", TODAY))
      .toEqual({ ok: true, kind: "request", date: TODAY });
  });
});

describe("plan request normalisation", () => {
  const option = (fields: Record<string, unknown>) => ({
    title: "Kino", details: "Near the venue.", suggested_time: null, task: "Movie at Kino", source_url: null, ...fields,
  });

  it("keeps only source links the web search returned", () => {
    const found = new Set(["https://kino.example/showtimes"]);
    const result = normalizePlanRequest({
      summary: " Two cinemas fit. ",
      options: [
        option({ source_url: "https://kino.example/showtimes/#today" }),
        option({ title: "Other", source_url: "https://invented.example/page" }),
      ],
    }, found);
    expect(result.summary).toBe("Two cinemas fit.");
    expect(result.options.map((o) => o.sourceUrl)).toEqual(["https://kino.example/showtimes", null]);
  });

  it("validates times, falls back to the title for an empty task, and caps at 10 options", () => {
    const result = normalizePlanRequest({
      summary: "x",
      options: Array.from({ length: 12 }, (_, index) => option({
        title: `Option ${index}`, task: index === 0 ? " " : "Go", suggested_time: index === 0 ? "16:00" : "4pm",
      })),
    }, new Set());
    expect(result.options).toHaveLength(10);
    expect(result.options[0]).toMatchObject({ time: "16:00", task: "Option 0" });
    expect(result.options[1].time).toBeNull();
  });
});

describe("morning email notes", () => {
  it("tidies points and keeps at most five of each", () => {
    expect(normalizeDailyEmailInsights({
      feedback: ["  You  ticked off the gym. ", "", "a", "b", "c", "d", "e"],
      suggestions: ["Put \"Order boxes\" on Friday."],
    })).toEqual({
      feedback: ["You ticked off the gym.", "a", "b", "c", "d"],
      suggestions: ["Put \"Order boxes\" on Friday."],
    });
  });

  it("drops the section when the model returned nothing usable", () => {
    expect(normalizeDailyEmailInsights({ feedback: [" "], suggestions: [] })).toBeNull();
  });
});
