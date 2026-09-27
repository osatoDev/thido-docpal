import "server-only";

import { randomUUID } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { lockDocumentForCommentAi } from "@/lib/documentAiJobs";

export const HISTORY_KEEP_COUNT = 100;
export const HISTORY_GRACE_DAYS = 14;
const GRACE_MS = HISTORY_GRACE_DAYS * 24 * 60 * 60 * 1000;
const CLAIM_MS = 15 * 60 * 1000;

export type HistoryNotice = {
  documentId: string;
  documentTitle: string;
  email: string;
  name: string | null;
  noticeId: string;
  deleteAfter: Date;
};

// Claims keep concurrent cron runs from mailing the same document. External
// email I/O happens after this short transaction, never while holding its lock.
export async function claimHistoryNotice(client: PrismaClient, documentId: string, now = new Date()): Promise<HistoryNotice | null> {
  return client.$transaction(async tx => {
    if (!await lockDocumentForCommentAi(tx, documentId)) return null;
    const document = await tx.document.findUnique({
      where: { id: documentId },
      select: { title: true, owner: { select: { email: true, emailVerified: true, name: true } }, historyRetention: true },
    });
    if (!document?.owner.email || !document.owner.emailVerified) return null;
    const state = document.historyRetention;
    if (state?.keepAll || state?.noticeSentAt || (state?.noticeClaimedAt && state.noticeClaimedAt.getTime() > now.getTime() - CLAIM_MS)) return null;
    const boundary = await tx.documentRevision.findMany({
      where: { documentId }, orderBy: { revision: "desc" }, skip: HISTORY_KEEP_COUNT - 1, take: 2, select: { revision: true },
    });
    if (boundary.length < 2) return null;
    const noticeId = randomUUID();
    const data = { noticeId, noticeClaimedAt: now, cutoffRevision: boundary[0].revision, noticeSentAt: null, noticeEmailId: null, deliveryConfirmedAt: null, deleteAfter: null };
    await tx.documentHistoryRetention.upsert({ where: { documentId }, create: { documentId, ...data }, update: data });
    return { documentId, documentTitle: document.title, email: document.owner.email, name: document.owner.name, noticeId, deleteAfter: new Date(now.getTime() + GRACE_MS) };
  });
}

export async function notifyHistoryOwner(client: PrismaClient, documentId: string, send: (notice: HistoryNotice) => Promise<string>) {
  const notice = await claimHistoryNotice(client, documentId);
  if (!notice) return false;
  const emailId = await send(notice);
  if (!emailId) throw new Error("Missing history notification receipt.");
  // Provider failure or an unconfigured sender never starts a deletion clock.
  // A process crash leaves only a claim, which is safe to retry after its lease.
  const sentAt = new Date();
  const result = await client.documentHistoryRetention.updateMany({
    where: { documentId, noticeId: notice.noticeId, keepAll: false, noticeSentAt: null },
    data: { noticeSentAt: sentAt, noticeEmailId: emailId },
  });
  return result.count === 1;
}

export async function confirmHistoryNoticeDelivery(client: PrismaClient, documentId: string, emailId: string, now = new Date()) {
  return client.documentHistoryRetention.updateMany({
    where: { documentId, noticeEmailId: emailId, keepAll: false, noticeSentAt: { not: null }, deliveryConfirmedAt: null },
    data: { deliveryConfirmedAt: now, deleteAfter: new Date(now.getTime() + GRACE_MS) },
  });
}

export async function keepAllDocumentHistory(client: PrismaClient, documentId: string, ownerId: string) {
  return client.$transaction(async tx => {
    if (!await lockDocumentForCommentAi(tx, documentId)) return false;
    const document = await tx.document.findFirst({ where: { id: documentId, ownerId }, select: { id: true } });
    if (!document) return false;
    await tx.documentHistoryRetention.upsert({
      where: { documentId },
      create: { documentId, keepAll: true },
      update: { keepAll: true, noticeId: null, noticeClaimedAt: null, noticeSentAt: null, noticeEmailId: null, deliveryConfirmedAt: null, deleteAfter: null, cutoffRevision: null },
    });
    return true;
  });
}

export async function pruneDocumentHistory(client: PrismaClient, documentId: string, now = new Date()) {
  return client.$transaction(async tx => {
    // Saving, restoring, opting out, and pruning use the same document row lock.
    if (!await lockDocumentForCommentAi(tx, documentId)) return 0;
    const state = await tx.documentHistoryRetention.findUnique({ where: { documentId } });
    if (!state || state.keepAll || !state.noticeSentAt || !state.noticeEmailId || !state.deliveryConfirmedAt || !state.deleteAfter || state.cutoffRevision === null ||
      state.deleteAfter > now || state.deliveryConfirmedAt.getTime() + GRACE_MS > now.getTime()) return 0;
    const boundary = await tx.documentRevision.findMany({
      where: { documentId }, orderBy: { revision: "desc" }, skip: HISTORY_KEEP_COUNT - 1, take: 1, select: { revision: true },
    });
    let deleted = 0;
    if (boundary[0]) {
      const result = await tx.documentRevision.deleteMany({
        where: { documentId, revision: { lt: Math.min(state.cutoffRevision, boundary[0].revision) } },
      });
      deleted = result.count;
    }
    await tx.documentHistoryRetention.update({
      where: { documentId },
      data: { noticeId: null, noticeClaimedAt: null, noticeSentAt: null, noticeEmailId: null, deliveryConfirmedAt: null, deleteAfter: null, cutoffRevision: null },
      select: { documentId: true },
    });
    return deleted;
  });
}
