import { describe, expect, it } from "vitest";

import {
  DOCUMENT_STARTERS,
  getDocumentStarter,
} from "@/lib/documentStarters";

describe("document starters", () => {
  it("provides more than ten complete, uniquely identified starters", () => {
    expect(DOCUMENT_STARTERS.length).toBeGreaterThan(10);
    expect(new Set(DOCUMENT_STARTERS.map((starter) => starter.id)).size).toBe(
      DOCUMENT_STARTERS.length,
    );

    for (const starter of DOCUMENT_STARTERS) {
      expect(Object.values(starter.answers).every((answer) => answer.length > 0)).toBe(
        true,
      );
    }
  });

  it("looks up a starter by its stable identifier", () => {
    expect(getDocumentStarter("strategy-memo")?.label).toBe("Strategy memo");
    expect(getDocumentStarter("missing-starter")).toBeNull();
  });
});
