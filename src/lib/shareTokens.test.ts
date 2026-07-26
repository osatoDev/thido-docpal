import { describe, expect, it } from "vitest";

import { createShareToken, isShareToken } from "@/lib/shareTokens";

describe("document share tokens", () => {
  it("creates unique, high-entropy, URL-safe bearer tokens", () => {
    const first = createShareToken();
    const second = createShareToken();

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
    expect(isShareToken(first)).toBe(true);
    expect(isShareToken("short")).toBe(false);
    expect(isShareToken(`${"a".repeat(42)}!`)).toBe(false);
  });
});
