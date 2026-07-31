import { describe, expect, it } from "vitest";

import { BETA_USER_LIMIT, nextBetaSeat } from "@/lib/betaAccess";

describe("beta access seats", () => {
  it("assigns the first and subsequent beta seats", () => {
    expect(nextBetaSeat([])).toBe(1);
    expect(nextBetaSeat([1, 2, 3, 4, 5, 6, 7])).toBe(8);
  });

  it("reuses an available place without exceeding the limit", () => {
    const allSeats = Array.from({ length: BETA_USER_LIMIT }, (_, index) => index + 1);
    expect(nextBetaSeat(allSeats.filter((seat) => seat !== 42))).toBe(42);
    expect(nextBetaSeat(allSeats)).toBeNull();
  });
});
