import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/ai/client", () => ({ anthropic: {} }));

const { normalizeDailyEmailInsights } = await import("@/lib/ai/planner");

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
