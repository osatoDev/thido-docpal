import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/rateLimit";

describe("in-memory rate limiting", () => {
  it("allows requests up to the limit and rejects the next one", () => {
    const key = `test:${crypto.randomUUID()}`;

    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(true);
    expect(checkRateLimit(key, 2, 60_000)).toBe(false);
  });

  it("keeps limits isolated by key", () => {
    const first = `test:${crypto.randomUUID()}`;
    const second = `test:${crypto.randomUUID()}`;

    expect(checkRateLimit(first, 1, 60_000)).toBe(true);
    expect(checkRateLimit(first, 1, 60_000)).toBe(false);
    expect(checkRateLimit(second, 1, 60_000)).toBe(true);
  });
});
