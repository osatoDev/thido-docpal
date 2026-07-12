import { prisma } from "@/lib/prisma";

/** Returns the document only if it exists and is owned by the given user. */
export async function getOwnedDocument(documentId: string, userId: string) {
  return prisma.document.findFirst({
    where: { id: documentId, ownerId: userId },
  });
}

/** Returns the comment only if its parent document is owned by the given user. */
export async function getOwnedComment(commentId: string, userId: string) {
  return prisma.comment.findFirst({
    where: { id: commentId, document: { ownerId: userId } },
    include: { suggestion: true },
  });
}

/** Returns the suggestion only if its parent document is owned by the given user. */
export async function getOwnedSuggestion(suggestionId: string, userId: string) {
  return prisma.suggestion.findFirst({
    where: { id: suggestionId, comment: { document: { ownerId: userId } } },
    include: { comment: true },
  });
}
