import { DocumentRevisionSource, type Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { initialRevisionData, recordDocumentRevision } from "@/lib/documentRevisions";

const now = new Date("2026-09-28T12:00:00Z");
const document = {
  id: "document-1",
  revision: 4,
  title: "Current title",
  content: { type: "doc", content: [] },
};

function fixture(source: DocumentRevisionSource | null, ageMs = 0) {
  const findFirst = vi.fn().mockResolvedValue(source === null ? null : {
    source,
    createdAt: new Date(now.getTime() - ageMs),
  });
  const create = vi.fn().mockResolvedValue({ id: "revision-4" });
  const update = vi.fn();
  return {
    findFirst, create, update,
    transaction: { documentRevision: { findFirst, create, update } } as unknown as Prisma.TransactionClient,
  };
}

describe("document revision recording", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it("skips history writes inside 24 hours without overwriting the restore point", async () => {
    const tx = fixture(DocumentRevisionSource.USER, 86_399_999);
    const result = await recordDocumentRevision(tx.transaction, document, {
      source: DocumentRevisionSource.USER, actorId: "user-1",
    });
    expect(result).toBeNull();
    expect(tx.create).not.toHaveBeenCalled();
    expect(tx.update).not.toHaveBeenCalled();
  });

  it("creates a new restore point at the 24-hour boundary", async () => {
    const tx = fixture(DocumentRevisionSource.USER, 86_400_000);
    await recordDocumentRevision(tx.transaction, document, {
      source: DocumentRevisionSource.USER, actorId: "user-1",
    });
    expect(tx.create).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({
        documentId: document.id, revision: 4, title: document.title,
        content: document.content, source: DocumentRevisionSource.USER,
        actorId: "user-1",
      }),
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it.each([null, DocumentRevisionSource.INITIAL, DocumentRevisionSource.AI,
    DocumentRevisionSource.IMPORT, DocumentRevisionSource.RESTORE])(
    "preserves the first user save after %s", async source => {
      const tx = fixture(source);
      await recordDocumentRevision(tx.transaction, document, { source: DocumentRevisionSource.USER });
      expect(tx.create).toHaveBeenCalledOnce();
    },
  );

  it.each([DocumentRevisionSource.AI, DocumentRevisionSource.IMPORT, DocumentRevisionSource.RESTORE])(
    "always records %s changes", async source => {
      const tx = fixture(DocumentRevisionSource.USER);
      await recordDocumentRevision(tx.transaction, document, {
        source, actorId: "user-1", restoredFromRevision: source === "RESTORE" ? 2 : undefined,
      });
      expect(tx.findFirst).not.toHaveBeenCalled();
      expect(tx.create).toHaveBeenCalledWith({
        select: { id: true },
        data: expect.objectContaining({
          source, actorId: "user-1", content: document.content,
          restoredFromRevision: source === "RESTORE" ? 2 : null,
        }),
      });
    },
  );

  it("builds the initial nested revision for new documents", () => {
    expect(initialRevisionData({ title: "Untitled Document", actorId: "user-1" })).toEqual({
      revision: 0, title: "Untitled Document",
      source: DocumentRevisionSource.INITIAL, actorId: "user-1",
    });
  });
});
