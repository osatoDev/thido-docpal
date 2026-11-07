import { describe, expect, it } from "vitest";
import { isPlanFeedbackDailyLimit, isTimeZone, shouldGiveAutoFeedback } from "@/lib/planFeedbackPolicy";

describe("automatic plan feedback policy", () => {
  it("never gives feedback when turned off or at the daily cap", () => {
    expect(shouldGiveAutoFeedback({ givenToday: 0, dailyLimit: 0, random: 0 })).toBe(false);
    expect(shouldGiveAutoFeedback({ givenToday: 3, dailyLimit: 3, random: 0 })).toBe(false);
  });

  it("gives feedback at random while under the cap", () => {
    expect(shouldGiveAutoFeedback({ givenToday: 2, dailyLimit: 3, random: 0.1 })).toBe(true);
    expect(shouldGiveAutoFeedback({ givenToday: 2, dailyLimit: 3, random: 0.9 })).toBe(false);
  });

  it("validates the configurable limit and time zones", () => {
    expect(isPlanFeedbackDailyLimit(3)).toBe(true);
    expect(isPlanFeedbackDailyLimit(4)).toBe(false);
    expect(isPlanFeedbackDailyLimit("3")).toBe(false);
    expect(isTimeZone("Europe/London")).toBe(true);
    expect(isTimeZone("Mars/Base")).toBe(false);
  });
});
