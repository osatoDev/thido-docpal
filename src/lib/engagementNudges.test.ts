import { describe, expect, it } from "vitest";

import { isWithinActivationNudgeWindow } from "@/lib/engagementNudges";

const now = new Date("2026-09-21T12:00:00.000Z");
const hoursAgo = (hours: number) =>
  new Date(now.getTime() - hours * 60 * 60 * 1000);

describe("isWithinActivationNudgeWindow", () => {
  it("excludes accounts younger than the minimum age", () => {
    expect(isWithinActivationNudgeWindow(hoursAgo(2), now)).toBe(false);
  });

  it("includes accounts within the window", () => {
    expect(isWithinActivationNudgeWindow(hoursAgo(24), now)).toBe(true);
  });

  it("excludes accounts older than the maximum age", () => {
    expect(isWithinActivationNudgeWindow(hoursAgo(96), now)).toBe(false);
  });
});
