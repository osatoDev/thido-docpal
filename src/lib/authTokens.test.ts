import { describe, expect, it } from "vitest";

import {
  authTokenExpiry,
  createAuthToken,
  hashAuthToken,
  isAuthTokenExpired,
} from "@/lib/authTokens";

describe("authentication tokens", () => {
  it("creates high-entropy URL-safe tokens and stores deterministic hashes", () => {
    const first = createAuthToken();
    const second = createAuthToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(hashAuthToken(first)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashAuthToken(first)).toBe(hashAuthToken(first));
    expect(hashAuthToken(first)).not.toBe(hashAuthToken(second));
  });

  it("calculates and evaluates expiration times", () => {
    const now = new Date("2026-07-22T12:00:00.000Z");
    const expiry = authTokenExpiry(60_000, now);

    expect(expiry.toISOString()).toBe("2026-07-22T12:01:00.000Z");
    expect(isAuthTokenExpired(expiry, now)).toBe(false);
    expect(isAuthTokenExpired(expiry, expiry)).toBe(true);
  });
});
