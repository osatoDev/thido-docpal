import { DocumentRevisionSource, type Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  initialRevisionData,
  recordDocumentRevision,
  revisionRetentionBucket,
  revisionsToPrune,
} from "@/lib/documentRevisions";

const DAY_MS = 86_400_000;
const now = new Date("2026-09-28T12:00:00Z");
const document = {
  id: "document-1",
  revision: 4,
  title: "Current title",
  content: { type: "doc", content: [] },
};

function fixture(
  source: DocumentRevisionSource | null,
  createdAt = now,
  existing: Array<{ id: string; revision: number; createdAt: Date }> = [],
) {
  const findFirst = vi.fn().mockResolvedValue(
    source === null ? null : { id: "latest", source, createdAt },
  );
  const findMany = vi.fn().mockResolvedValue(existing);
  const create = vi.fn().mockResolvedValue({ id: "revision-4" });
  const update = vi.fn().mockResolvedValue({ id: "latest" });
  const deleteMany = vi.fn();
  return {
    findFirst, findMany, create, update, deleteMany,
    transaction: {
      documentRevision: { findFirst, findMany, create, update, deleteMany },
    } as unknown as Prisma.TransactionClient,
  };
}

describe("document revision recording", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(now);
  });
  afterEach(() => vi.useRealTimers());

  it("refreshes today's version instead of adding another", async () => {
    const tx = fixture(
      DocumentRevisionSource.USER,
      new Date("2026-09-28T00:30:00Z"),
    );
    await recordDocumentRevision(tx.transaction, document, {
      source: DocumentRevisionSource.USER, actorId: "user-1",
    });
    expect(tx.update).toHaveBeenCalledWith({
      where: { id: "latest" },
      select: { id: true },
      data: expect.objectContaining({
        revision: 4, title: document.title, content: document.content,
        actorId: "user-1", createdAt: now,
      }),
    });
    expect(tx.create).not.toHaveBeenCalled();
  });

  it("starts a new version on the first save of a new UTC day", async () => {
    const tx = fixture(
      DocumentRevisionSource.USER,
      new Date("2026-09-27T23:59:59Z"),
    );
    await recordDocumentRevision(tx.transaction, document, {
      source: DocumentRevisionSource.USER, actorId: "user-1",
    });
    expect(tx.create).toHaveBeenCalledWith({
      select: { id: true },
      data: expect.objectContaining({
        documentId: document.id, revision: 4,
        source: DocumentRevisionSource.USER, actorId: "user-1",
      }),
    });
    expect(tx.update).not.toHaveBeenCalled();
  });

  it.each([null, DocumentRevisionSource.INITIAL, DocumentRevisionSource.RESTORE,
    DocumentRevisionSource.IMPORT])(
    "starts a new version when the latest is %s", async (latestSource) => {
      const tx = fixture(latestSource);
      await recordDocumentRevision(tx.transaction, document, {
        source: DocumentRevisionSource.USER,
      });
      expect(tx.create).toHaveBeenCalledOnce();
      expect(tx.update).not.toHaveBeenCalled();
    });

  it("prunes older versions after creating one", async () => {
    const yesterday = new Date(now.getTime() - DAY_MS);
    const tx = fixture(null, now, [
      { id: "today", revision: 4, createdAt: now },
      { id: "yesterday-late", revision: 3, createdAt: yesterday },
      { id: "yesterday-early", revision: 2, createdAt: new Date(yesterday.getTime() - 60_000) },
    ]);
    await recordDocumentRevision(tx.transaction, document, {
      source: DocumentRevisionSource.RESTORE, restoredFromRevision: 1,
    });
    expect(tx.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["yesterday-early"] } },
    });
  });

  it("describes the immutable initial revision", () => {
    expect(initialRevisionData({ title: "New", actorId: "user-1" })).toEqual({
      revision: 0, title: "New", source: DocumentRevisionSource.INITIAL,
      actorId: "user-1",
    });
  });
});

describe("revision retention", () => {
  const daysAgo = (days: number) => new Date(now.getTime() - days * DAY_MS);

  it("buckets by day, then Monday-based week, then month", () => {
    expect(revisionRetentionBucket(daysAgo(29), now)).toBe("day:2026-08-30");
    // 30 days ago is Saturday 29 August; its week starts Monday 24 August.
    expect(revisionRetentionBucket(daysAgo(30), now)).toBe("week:2026-08-24");
    expect(revisionRetentionBucket(daysAgo(182), now)).toBe("week:2026-03-30");
    expect(revisionRetentionBucket(daysAgo(183), now)).toBe("month:2026-03");
  });

  it("keeps every revision from the current day", () => {
    const revisions = [
      { id: "restore", revision: 3, createdAt: now },
      { id: "before-restore", revision: 2, createdAt: new Date(now.getTime() - 60_000) },
    ];
    expect(revisionsToPrune(revisions, now)).toEqual([]);
  });

  it("keeps the newest revision in each bucket", () => {
    const revisions = [
      { id: "r10", revision: 10, createdAt: daysAgo(0) },
      { id: "r9", revision: 9, createdAt: daysAgo(1) },
      { id: "r8", revision: 8, createdAt: daysAgo(40) },
      { id: "r7", revision: 7, createdAt: daysAgo(41) },
      { id: "r6", revision: 6, createdAt: daysAgo(200) },
      { id: "r5", revision: 5, createdAt: daysAgo(205) },
    ];
    // 40 and 41 days ago fall in the same week; 200 and 205 in the same month.
    expect(revisionsToPrune(revisions, now).sort()).toEqual(["r5", "r7"]);
  });

  it("stays well under 100 versions after three years of daily use", () => {
    const revisions = Array.from({ length: 3 * 365 }, (_, day) => ({
      id: `r${day}`,
      revision: 3 * 365 - day,
      createdAt: daysAgo(day),
    }));
    const kept = revisions.length - revisionsToPrune(revisions, now).length;
    expect(kept).toBeLessThan(100);
  });
});
