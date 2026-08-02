import { DocumentRevisionSource, type Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  initialRevisionData,
  recordDocumentRevision,
} from "@/lib/documentRevisions";

const document = {
  id: "document-1",
  revision: 4,
  title: "Current title",
  content: { type: "doc", content: [] },
};

describe("document revision recording", () => {
  it("coalesces rapid saves by the same user", async () => {
    const findFirst = vi.fn().mockResolvedValue({
      id: "revision-3",
      source: DocumentRevisionSource.USER,
      actorId: "user-1",
      createdAt: new Date(),
    });
    const update = vi.fn().mockResolvedValue({ id: "revision-3" });
    const create = vi.fn();
    const transaction = {
      documentRevision: { findFirst, update, create },
    } as unknown as Prisma.TransactionClient;

    await recordDocumentRevision(transaction, document, {
      source: DocumentRevisionSource.USER,
      actorId: "user-1",
    });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ revision: 4, title: "Current title" }),
      }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("always records AI changes as distinct recoverable versions", async () => {
    const create = vi.fn().mockResolvedValue({ id: "revision-4" });
    const transaction = {
      documentRevision: { create },
    } as unknown as Prisma.TransactionClient;

    await recordDocumentRevision(transaction, document, {
      source: DocumentRevisionSource.AI,
      actorId: "user-1",
    });

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        revision: 4,
        source: DocumentRevisionSource.AI,
      }),
    });
  });

  it("builds the initial nested revision for new documents", () => {
    expect(
      initialRevisionData({ title: "Untitled Document", actorId: "user-1" }),
    ).toEqual({
      revision: 0,
      title: "Untitled Document",
      source: DocumentRevisionSource.INITIAL,
      actorId: "user-1",
    });
  });
});
