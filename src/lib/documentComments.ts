import type { PrismaClient } from "@prisma/client";
import type { JSONContent } from "@tiptap/react";

import { collectCommentMarkIds } from "@/lib/documentMarks";

type CommentClient = Pick<PrismaClient, "comment" | "$transaction">;

export async function reconcileOrphanedComments(
  client: CommentClient,
  documentId: string,
  content: JSONContent,
) {
  const presentIds = Array.from(collectCommentMarkIds(content));

  await client.$transaction([
    client.comment.updateMany({
      where: {
        documentId,
        scope: "SELECTION",
        isOrphaned: false,
        anchorMarkId: { notIn: presentIds },
      },
      data: { isOrphaned: true },
    }),
    client.comment.updateMany({
      where: {
        documentId,
        scope: "SELECTION",
        isOrphaned: true,
        anchorMarkId: { in: presentIds },
      },
      data: { isOrphaned: false },
    }),
  ]);
}
