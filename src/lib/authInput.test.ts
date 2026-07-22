import { describe, expect, it } from "vitest";

import {
  emailSchema,
  loginSchema,
  registrationSchema,
  resetPasswordSchema,
  safeRedirectPath,
} from "@/lib/authInput";

describe("authentication input", () => {
  it("normalizes email addresses", () => {
    expect(emailSchema.parse("  USER@Example.COM ")).toBe("user@example.com");
    expect(
      loginSchema.parse({ email: " A@EXAMPLE.COM ", password: "secret" }),
    ).toEqual({ email: "a@example.com", password: "secret" });
  });

  it("requires a twelve-character password for registration and reset", () => {
    expect(
      registrationSchema.safeParse({
        name: "Ada",
        email: "ada@example.com",
        password: "too-short",
      }).success,
    ).toBe(false);
    expect(
      resetPasswordSchema.safeParse({
        token: "a".repeat(43),
        password: "a-secure-password",
      }).success,
    ).toBe(true);
  });

  it("only accepts local callback paths", () => {
    expect(safeRedirectPath("/dashboard?tab=recent")).toBe(
      "/dashboard?tab=recent",
    );
    expect(safeRedirectPath("https://example.com/phish")).toBe("/");
    expect(safeRedirectPath("//example.com/phish")).toBe("/");
  });
});
