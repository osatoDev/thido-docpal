import type { PrismaClient } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { claimHistoryNotice, confirmHistoryNoticeDelivery, keepAllDocumentHistory, notifyHistoryOwner, pruneDocumentHistory } from "./documentHistoryRetention";

const now = new Date("2026-10-20T12:00:00Z");
const delivered = new Date("2026-10-01T12:00:00Z");
const makeClient = () => {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([{ id: "doc" }]),
    document: {
      findUnique: vi.fn().mockResolvedValue({ title: "Draft", owner: { email: "owner@example.test", emailVerified: now, name: "Writer" }, historyRetention: null }),
      findFirst: vi.fn().mockResolvedValue({ id: "doc" }),
    },
    documentRevision: {
      findMany: vi.fn().mockResolvedValue([{ revision: 26 }, { revision: 25 }]),
      deleteMany: vi.fn().mockResolvedValue({ count: 25 }),
    },
    documentHistoryRetention: {
      findUnique: vi.fn().mockResolvedValue({ keepAll: false, noticeSentAt: delivered, noticeEmailId: "mail", deliveryConfirmedAt: delivered, deleteAfter: new Date("2026-10-15T12:00:00Z"), cutoffRevision: 26 }),
      upsert: vi.fn(), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  };
  const client = { ...tx, $transaction: vi.fn(async (fn: (value: typeof tx) => Promise<unknown>) => fn(tx)) } as unknown as PrismaClient;
  return { client, tx };
};

describe("history retention safeguards", () => {
  let fixture: ReturnType<typeof makeClient>;
  beforeEach(() => { fixture = makeClient(); });

  it("does not warn at or below 100 versions", async () => {
    fixture.tx.documentRevision.findMany.mockResolvedValue([{ revision: 1 }]);
    expect(await claimHistoryNotice(fixture.client, "doc", now)).toBeNull();
    expect(fixture.tx.documentHistoryRetention.upsert).not.toHaveBeenCalled();
  });

  it.each([
    { keepAll: true },
    { noticeSentAt: delivered },
    { noticeClaimedAt: now },
  ])("does not duplicate or override a pending/preserved notice: %j", async historyRetention => {
    fixture.tx.document.findUnique.mockResolvedValue({ title: "Draft", owner: { email: "owner@example.test", emailVerified: now, name: null }, historyRetention });
    expect(await claimHistoryNotice(fixture.client, "doc", now)).toBeNull();
  });

  it("does not schedule cleanup when sending fails", async () => {
    await expect(notifyHistoryOwner(fixture.client, "doc", vi.fn().mockRejectedValue(new Error("mail failed")))).rejects.toThrow("mail failed");
    expect(fixture.tx.documentHistoryRetention.updateMany).not.toHaveBeenCalled();
  });

  it("accepting an email alone does not start deletion", async () => {
    await notifyHistoryOwner(fixture.client, "doc", vi.fn().mockResolvedValue("mail"));
    expect(fixture.tx.documentHistoryRetention.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { noticeSentAt: expect.any(Date), noticeEmailId: "mail" } }));
  });

  it("starts a full fourteen days only on confirmed delivery", async () => {
    await confirmHistoryNoticeDelivery(fixture.client, "doc", "mail", delivered);
    expect(fixture.tx.documentHistoryRetention.updateMany).toHaveBeenCalledWith({
      where: { documentId: "doc", noticeEmailId: "mail", keepAll: false, noticeSentAt: { not: null }, deliveryConfirmedAt: null },
      data: { deliveryConfirmedAt: delivered, deleteAfter: new Date("2026-10-15T12:00:00Z") },
    });
  });

  it.each([
    { keepAll: true }, { noticeSentAt: null }, { deliveryConfirmedAt: null },
    { noticeEmailId: null }, { deleteAfter: null }, { cutoffRevision: null },
    { deliveryConfirmedAt: now }, { deleteAfter: new Date("2026-10-21T12:00:00Z") },
  ])("refuses unsafe deletion: %j", async override => {
    const state = await fixture.tx.documentHistoryRetention.findUnique();
    fixture.tx.documentHistoryRetention.findUnique.mockResolvedValue({ ...state, ...override });
    expect(await pruneDocumentHistory(fixture.client, "doc", now)).toBe(0);
    expect(fixture.tx.documentRevision.deleteMany).not.toHaveBeenCalled();
  });

  it("only deletes versions covered by the notice, even if new versions were added", async () => {
    fixture.tx.documentRevision.findMany.mockResolvedValue([{ revision: 60 }]);
    expect(await pruneDocumentHistory(fixture.client, "doc", now)).toBe(25);
    expect(fixture.tx.documentRevision.deleteMany).toHaveBeenCalledWith({ where: { documentId: "doc", revision: { lt: 26 } } });
  });

  it("always preserves the current newest 100 if fewer versions remain", async () => {
    fixture.tx.documentRevision.findMany.mockResolvedValue([{ revision: 10 }]);
    await pruneDocumentHistory(fixture.client, "doc", now);
    expect(fixture.tx.documentRevision.deleteMany).toHaveBeenCalledWith({ where: { documentId: "doc", revision: { lt: 10 } } });
  });

  it("requires the owner to keep history", async () => {
    fixture.tx.document.findFirst.mockResolvedValue(null);
    expect(await keepAllDocumentHistory(fixture.client, "doc", "other-user")).toBe(false);
    expect(fixture.tx.documentHistoryRetention.upsert).not.toHaveBeenCalled();
  });

  it("keeping history clears the pending cleanup under the document lock", async () => {
    expect(await keepAllDocumentHistory(fixture.client, "doc", "owner")).toBe(true);
    expect(fixture.tx.$queryRaw).toHaveBeenCalled();
    expect(fixture.tx.documentHistoryRetention.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: expect.objectContaining({ keepAll: true, deleteAfter: null, cutoffRevision: null }) }));
  });
});
