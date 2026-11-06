import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

/** Documents are private to their owner; there is no sharing. */
export function documentAccessWhere(userId: string): Prisma.DocumentWhereInput {
  return { ownerId: userId };
}

export async function getDocumentForUser(documentId: string, userId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, ownerId: userId },
  });
}

/**
 * Takes a row lock on the document for the rest of the transaction, so saves,
 * restores and imports of the same document apply one at a time.
 */
export async function lockDocumentRow(
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
