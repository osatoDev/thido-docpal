import { prisma } from "@/lib/prisma";
import { confirmHistoryNoticeDelivery, notifyHistoryOwner, pruneDocumentHistory } from "@/lib/documentHistoryRetention";
import { sendHistoryRetentionEmail, wasHistoryNoticeDelivered } from "@/lib/email";
import { reportServerError } from "@/lib/rollbar/server";

export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Never expire history when notifications cannot be sent.
  if (!process.env.RESEND_API_KEY) return Response.json({ error: "Email sender is not configured." }, { status: 503 });
  const deadline = Date.now() + 45_000;
  const counts = { notices: 0, versionsDeleted: 0, deliveryPending: 0, errors: 0 };
  const awaitingDelivery = await prisma.documentHistoryRetention.findMany({
    where: { keepAll: false, noticeEmailId: { not: null }, deliveryConfirmedAt: null },
    orderBy: { updatedAt: "asc" }, take: 25, select: { documentId: true, noticeEmailId: true },
  });
  for (const state of awaitingDelivery) {
    if (Date.now() >= deadline) break;
    try {
      if (state.noticeEmailId && await wasHistoryNoticeDelivered(state.noticeEmailId)) {
        await confirmHistoryNoticeDelivery(prisma, state.documentId, state.noticeEmailId);
      } else {
        counts.deliveryPending += 1;
        await prisma.documentHistoryRetention.updateMany({
          where: { documentId: state.documentId, noticeEmailId: state.noticeEmailId }, data: { updatedAt: new Date() },
        });
      }
    } catch (error) {
      counts.errors += 1;
      await reportServerError(error, { source: "cron", operation: "verify-history-notice-delivery", documentId: state.documentId });
    }
  }
  const due = await prisma.documentHistoryRetention.findMany({
    where: { keepAll: false, noticeSentAt: { not: null }, deleteAfter: { lte: new Date() } },
    orderBy: { deleteAfter: "asc" }, take: 25, select: { documentId: true },
  });
  for (const { documentId } of due) {
    if (Date.now() >= deadline) break;
    try {
      counts.versionsDeleted += await pruneDocumentHistory(prisma, documentId);
    } catch (error) {
      counts.errors += 1;
      await reportServerError(error, { source: "cron", operation: "prune-document-history", documentId });
    }
  }

  // Find over-limit documents without transferring snapshot bodies. Oldest
  // checked documents go first so retries cannot monopolize the daily batch.
  const candidates = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT d."id" FROM "Document" d
    JOIN "User" u ON u."id" = d."ownerId"
    LEFT JOIN "DocumentHistoryRetention" h ON h."documentId" = d."id"
    WHERE COALESCE(h."keepAll", false) = false AND h."noticeSentAt" IS NULL
      AND u."email" IS NOT NULL AND u."emailVerified" IS NOT NULL
      AND (SELECT count(*) FROM (SELECT 1 FROM "DocumentRevision" r
           WHERE r."documentId" = d."id" LIMIT 101) versions) > 100
    ORDER BY h."updatedAt" ASC NULLS FIRST, d."id" ASC LIMIT 25
  `;
  for (const { id } of candidates) {
    if (Date.now() >= deadline) break;
    try {
      if (await notifyHistoryOwner(prisma, id, sendHistoryRetentionEmail)) counts.notices += 1;
    } catch (error) {
      counts.errors += 1;
      await reportServerError(error, { source: "cron", operation: "notify-history-retention", documentId: id });
    }
  }
  return Response.json(counts);
}
