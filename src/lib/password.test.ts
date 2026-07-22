import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("verifies the correct password and rejects another password", async () => {
    const hash = await hashPassword("correct horse battery staple");

    await expect(
      verifyPassword("correct horse battery staple", hash),
    ).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", hash)).resolves.toBe(
      false,
    );
  });

  it("rejects malformed and missing hashes", async () => {
    await expect(verifyPassword("password", "not-a-valid-hash")).resolves.toBe(
      false,
    );
    await expect(verifyPassword("password", null)).resolves.toBe(false);
  });
});
