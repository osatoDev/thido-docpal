import { describe, expect, it } from "vitest";

import {
  isWithinActivationNudgeWindow,
  isWithinReactivationNudgeWindow,
} from "@/lib/engagementNudges";

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

describe("isWithinReactivationNudgeWindow", () => {
  it("excludes activity more recent than the minimum idle time", () => {
    expect(isWithinReactivationNudgeWindow(hoursAgo(2), now)).toBe(false);
  });

  it("includes activity within the window", () => {
    expect(isWithinReactivationNudgeWindow(hoursAgo(30), now)).toBe(true);
  });

  it("excludes activity older than the maximum idle time", () => {
    expect(isWithinReactivationNudgeWindow(hoursAgo(96), now)).toBe(false);
  });
});
