import { describe, expect, it } from "vitest";
import { isTimeZone } from "@/lib/timeZone";

describe("time zones", () => {
  it("accepts real IANA zones only", () => {
    expect(isTimeZone("Europe/London")).toBe(true);
    expect(isTimeZone("Mars/Base")).toBe(false);
    expect(isTimeZone(3)).toBe(false);
  });
});
