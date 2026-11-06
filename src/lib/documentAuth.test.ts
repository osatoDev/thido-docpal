import { describe, expect, it } from "vitest";

import { documentAccessWhere } from "@/lib/documentAuth";

describe("document access", () => {
  it("limits documents to their owner", () => {
    expect(documentAccessWhere("owner")).toEqual({ ownerId: "owner" });
  });
});
