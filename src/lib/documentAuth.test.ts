import { describe, expect, it } from "vitest";

import {
  effectiveDocumentPermission,
  documentAccessWhere,
  hasDocumentPermission,
  normalizeCollaboratorEmail,
  strongestDocumentPermission,
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

  it("uses the strongest direct or active-link permission", () => {
    expect(strongestDocumentPermission("COMMENT", "FULL")).toBe("FULL");
    expect(
      effectiveDocumentPermission({
        ownerId: "owner",
        userId: "link-user",
        collaboratorPermission: "VIEW",
        linkPermission: "EDIT",
      }),
    ).toBe("EDIT");
  });

  it("requires an active token and a user link grant for link-derived access", () => {
    expect(documentAccessWhere("link-user", null, "EDIT")).toMatchObject({
      OR: expect.arrayContaining([
        {
          shareToken: { not: null },
          sharePermission: { in: ["EDIT", "FULL"] },
          linkAccesses: { some: { userId: "link-user" } },
        },
      ]),
    });
  });
});
