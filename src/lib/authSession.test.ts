import { describe, expect, it } from "vitest";

import {
  AUTH_SESSION_MAX_AGE_SECONDS,
  AUTH_SESSION_OPTIONS,
} from "@/lib/authSession";

describe("authentication session policy", () => {
  it("uses the browser-compliant maximum rolling lifetime", () => {
    expect(AUTH_SESSION_MAX_AGE_SECONDS).toBe(400 * 24 * 60 * 60);
    expect(AUTH_SESSION_OPTIONS).toEqual({
      strategy: "jwt",
      maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
    });
    expect(AUTH_SESSION_MAX_AGE_SECONDS).toBeGreaterThan(30 * 24 * 60 * 60);
  });
});
