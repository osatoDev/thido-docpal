import { describe, expect, it } from "vitest";

import {
  BETA_USER_LIMIT,
  betaSeatLockStatement,
  nextApprovedBetaSeat,
  nextBetaSeat,
} from "@/lib/betaAccess";

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

  it("casts the PostgreSQL advisory-lock result to a Prisma-supported type", () => {
    const statement = betaSeatLockStatement(42);

    expect(statement.sql).toContain("pg_advisory_xact_lock(?)::text");
    expect(statement.values).toEqual([42]);
  });

  it("assigns reviewed users after every seat already granted", () => {
    expect(nextApprovedBetaSeat([1, 2, 100])).toBe(101);
    expect(nextApprovedBetaSeat([])).toBe(1);
  });
});
