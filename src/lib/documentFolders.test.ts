import { describe, expect, it } from "vitest";

import {
  MAX_FOLDER_NAME_LENGTH,
  normalizeFolderName,
} from "@/lib/documentFolders";

describe("normalizeFolderName", () => {
  it("trims and collapses whitespace", () => {
    expect(normalizeFolderName("  Client   work  ")).toEqual({
      ok: true,
      name: "Client work",
      nameKey: "client work",
    });
  });

  it("rejects blank and oversized names", () => {
    expect(normalizeFolderName("   ")).toEqual({
      ok: false,
      error: "Enter a folder name.",
    });
    expect(normalizeFolderName("x".repeat(MAX_FOLDER_NAME_LENGTH + 1))).toEqual({
      ok: false,
      error: `Keep folder names to ${MAX_FOLDER_NAME_LENGTH} characters or fewer.`,
    });
  });

  it("builds a case-insensitive uniqueness key", () => {
    expect(normalizeFolderName("Legal")).toMatchObject({ nameKey: "legal" });
    expect(normalizeFolderName("LEGAL")).toMatchObject({ nameKey: "legal" });
  });
});
