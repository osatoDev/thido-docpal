import type { Comment, Prisma } from "@prisma/client";

export const COMMENT_AI_JOB_TIMEOUT_MS = 10 * 60_000;
export const DOCUMENT_AI_LOCK_MESSAGE =
  "Thido is actioning this document's comments. Wait for it to finish before editing or adding another comment.";

type CommentAiJobClient = Pick<Prisma.TransactionClient, "comment">;

export function commentAiJobCutoff(now = new Date()) {
  return new Date(now.getTime() - COMMENT_AI_JOB_TIMEOUT_MS);
}

export function isCommentAiJobActive(
  comment: Pick<Comment, "aiStatus" | "aiStartedAt">,
  now = new Date(),
) {
  return (
    comment.aiStatus === "PENDING" &&
    !!comment.aiStartedAt &&
    comment.aiStartedAt > commentAiJobCutoff(now)
  );
}

export async function lockDocumentForCommentAi(
  transaction: Prisma.TransactionClient,
  documentId: string,
) {
  const rows = await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "Document"
    WHERE "id" = ${documentId}
    FOR UPDATE
  `;
  return rows.length === 1;
}

export async function expireStaleCommentAiJobs(
  client: CommentAiJobClient,
  documentId: string,
  now = new Date(),
) {
  await client.comment.updateMany({
    where: {
      documentId,
      parentId: null,
      aiStatus: "PENDING",
      OR: [
        { aiStartedAt: null },
        { aiStartedAt: { lte: commentAiJobCutoff(now) } },
      ],
    },
    data: {
      aiStatus: "FAILED",
      aiCompletedAt: now,
    },
  });
}

export async function hasActiveCommentAiJob(
  client: CommentAiJobClient,
  documentId: string,
  { now = new Date() }: { now?: Date } = {},
) {
  const comment = await client.comment.findFirst({
    where: {
      documentId,
      parentId: null,
      aiStatus: "PENDING",
      aiStartedAt: { gt: commentAiJobCutoff(now) },
    },
    select: { id: true },
  });
  return !!comment;
}
