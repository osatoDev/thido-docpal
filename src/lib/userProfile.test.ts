import { describe, expect, it } from "vitest";
import { getUserInitials } from "@/lib/userProfile";

describe("getUserInitials", () => {
  it("uses the first and last parts of a full name", () => {
    expect(getUserInitials("Osato Guobadia", "osato@example.com")).toBe("OG");
  });

  it("uses a single initial for a one-part name", () => {
    expect(getUserInitials("Osato", "osato@example.com")).toBe("O");
  });

  it("falls back to meaningful email initials", () => {
    expect(getUserInitials(null, "osato.guobadia@example.com")).toBe("OG");
  });

  it("uses a generic user initial without a name or email", () => {
    expect(getUserInitials(null, null)).toBe("U");
  });
});
