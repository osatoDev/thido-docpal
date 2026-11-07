import { describe, expect, it } from "vitest";
import { guessDay } from "./documentDays";

const reference = "2026-10-11";
describe("day guessing", () => {
  it.each([
    ["Today", "2026-10-11"],
    ["Tomorrow's tasks", "2026-10-12"],
    ["Yesterday", "2026-10-10"],
    ["day after tomorrow", "2026-10-13"],
    ["Monday", "2026-10-12"],
    ["next Sunday", "2026-10-18"],
    ["last Friday", "2026-10-09"],
    ["2027-01-03 \u2014 planning", "2027-01-03"],
    ["October 12", "2026-10-12"],
    ["12th Oct", "2026-10-12"],
    ["Friday, October 16, 2026", "2026-10-16"],
    ["29 February 2028", "2028-02-29"],
    ["13/10/2026", "2026-10-13"],
    ["10/13/2026", "2026-10-13"],
  ])("guesses %s", (text, expected) => {
    expect(guessDay(text, reference)).toBe(expected);
  });
  it.each(["", "Buy milk", "03/04/2026", "February 30", "2026-02-29", "October 12 or October 13", "today or tomorrow", "Monday or Tuesday"]) ("asks for clarification for %s", text => {
    expect(guessDay(text, reference)).toBeNull();
  });
  it("crosses year boundaries for relative dates", () => {
    expect(guessDay("tomorrow", "2026-12-31")).toBe("2027-01-01");
    expect(guessDay("yesterday", "2027-01-01")).toBe("2026-12-31");
  });
});
