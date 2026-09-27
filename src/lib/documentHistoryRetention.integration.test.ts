import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { claimHistoryNotice, confirmHistoryNoticeDelivery, keepAllDocumentHistory, pruneDocumentHistory } from "./documentHistoryRetention";

const databaseUrl = process.env.HISTORY_TEST_DATABASE_URL;
describe.skipIf(!databaseUrl)("history retention with local PostgreSQL", () => {
  let prisma: PrismaClient;
  let ownerId: string;
  beforeAll(async () => {
    if (!databaseUrl || new URL(databaseUrl).hostname !== "127.0.0.1") throw new Error("Only an isolated local database is allowed.");
    prisma = new PrismaClient({ datasourceUrl: databaseUrl });
    const user = await prisma.user.create({ data: { email: `history-${randomUUID()}@example.test`, emailVerified: new Date() } });
    ownerId = user.id;
  });
  afterAll(async () => {
    if (ownerId) await prisma.user.delete({ where: { id: ownerId } });
    await prisma?.$disconnect();
  });
  async function document() {
    return prisma.document.create({ data: {
      ownerId, revision: 125,
      revisions: { create: Array.from({ length: 125 }, (_, i) => ({ revision: i + 1, title: `Version ${i + 1}`, source: "IMPORT" })) },
    } });
  }

  it("preserves all history until delivery plus 14 days, and deletes only warned versions", async () => {
    const doc = await document();
    const start = new Date("2026-09-01T12:00:00Z");
    expect(await claimHistoryNotice(prisma, doc.id, start)).not.toBeNull();
    expect(await claimHistoryNotice(prisma, doc.id, start)).toBeNull();
    await prisma.documentHistoryRetention.update({ where: { documentId: doc.id }, data: { noticeSentAt: start, noticeEmailId: "mock-mail" } });
    expect(await pruneDocumentHistory(prisma, doc.id, new Date("2026-10-01"))).toBe(0);
    await confirmHistoryNoticeDelivery(prisma, doc.id, "mock-mail", start);
    expect(await pruneDocumentHistory(prisma, doc.id, new Date("2026-09-15T11:59:59Z"))).toBe(0);
    await prisma.documentRevision.createMany({ data: Array.from({ length: 20 }, (_, i) => ({ documentId: doc.id, revision: 126 + i, title: "New during grace", source: "IMPORT" })) });
    expect(await pruneDocumentHistory(prisma, doc.id, new Date("2026-09-15T12:00:00Z"))).toBe(25);
    expect(await prisma.documentRevision.count({ where: { documentId: doc.id } })).toBe(120);
    expect((await prisma.documentRevision.findFirstOrThrow({ where: { documentId: doc.id }, orderBy: { revision: "asc" } })).revision).toBe(26);
    expect(await prisma.document.findUnique({ where: { id: doc.id } })).not.toBeNull();
  });

  it("owner opt-out cancels due cleanup and applies to future notices", async () => {
    const doc = await document();
    const start = new Date("2026-09-01T12:00:00Z");
    await claimHistoryNotice(prisma, doc.id, start);
    await prisma.documentHistoryRetention.update({ where: { documentId: doc.id }, data: { noticeSentAt: start, noticeEmailId: "mock-mail" } });
    await confirmHistoryNoticeDelivery(prisma, doc.id, "mock-mail", start);
    expect(await keepAllDocumentHistory(prisma, doc.id, "not-owner")).toBe(false);
    expect(await keepAllDocumentHistory(prisma, doc.id, ownerId)).toBe(true);
    expect(await pruneDocumentHistory(prisma, doc.id, new Date("2026-10-01"))).toBe(0);
    expect(await claimHistoryNotice(prisma, doc.id, new Date("2026-10-01"))).toBeNull();
    expect(await prisma.documentRevision.count({ where: { documentId: doc.id } })).toBe(125);
  });
});
