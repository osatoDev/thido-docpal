import { describe, expect, it } from "vitest";

import {
  effectiveDocumentPermission,
  hasDocumentPermission,
  normalizeCollaboratorEmail,
} from "@/lib/documentAuth";

describe("document collaboration permissions", () => {
  it("orders permissions without granting lower roles edit or full access", () => {
    expect(hasDocumentPermission("VIEW", "COMMENT")).toBe(false);
    expect(hasDocumentPermission("COMMENT", "COMMENT")).toBe(true);
    expect(hasDocumentPermission("COMMENT", "EDIT")).toBe(false);
    expect(hasDocumentPermission("EDIT", "COMMENT")).toBe(true);
    expect(hasDocumentPermission("FULL", "EDIT")).toBe(true);
  });

  it("always gives the owner full access", () => {
    expect(
      effectiveDocumentPermission({
        ownerId: "owner",
        userId: "owner",
        collaboratorPermission: "VIEW",
      }),
    ).toBe("FULL");
  });

  it("normalizes invite addresses and preserves collaborator access", () => {
    expect(normalizeCollaboratorEmail(" Person@Example.COM ")).toBe(
      "person@example.com",
    );
    expect(
      effectiveDocumentPermission({
        ownerId: "owner",
        userId: "collaborator",
        collaboratorPermission: "EDIT",
      }),
    ).toBe("EDIT");
  });
});
