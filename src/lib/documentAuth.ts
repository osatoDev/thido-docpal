import type { DocumentPermission, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const PERMISSION_RANK: Record<DocumentPermission, number> = {
  VIEW: 0,
  COMMENT: 1,
  EDIT: 2,
  FULL: 3,
};

export const DOCUMENT_PERMISSIONS = [
  "VIEW",
  "COMMENT",
  "EDIT",
  "FULL",
] as const satisfies readonly DocumentPermission[];

export function strongestDocumentPermission(
  ...permissions: Array<DocumentPermission | null | undefined>
): DocumentPermission {
  return permissions.reduce<DocumentPermission>(
    (strongest, permission) =>
      permission && PERMISSION_RANK[permission] > PERMISSION_RANK[strongest]
        ? permission
        : strongest,
    "VIEW",
  );
}

export function normalizeCollaboratorEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hasDocumentPermission(
  actual: DocumentPermission,
  required: DocumentPermission,
) {
  return PERMISSION_RANK[actual] >= PERMISSION_RANK[required];
}

function permissionsAtLeast(required: DocumentPermission) {
  return DOCUMENT_PERMISSIONS.filter((permission) =>
    hasDocumentPermission(permission, required),
  );
}

export function documentAccessWhere(
  userId: string,
  email: string | null | undefined,
  required: DocumentPermission = "VIEW",
): Prisma.DocumentWhereInput {
  const normalizedEmail =
    typeof email === "string" ? normalizeCollaboratorEmail(email) : "";

  return {
    OR: [
      { ownerId: userId },
      ...(normalizedEmail
        ? [
            {
              collaborators: {
                some: {
                  email: normalizedEmail,
                  permission: { in: permissionsAtLeast(required) },
                },
              },
            } satisfies Prisma.DocumentWhereInput,
          ]
        : []),
      {
        shareToken: { not: null },
        sharePermission: { in: permissionsAtLeast(required) },
        linkAccesses: { some: { userId } },
      },
    ],
  };
}

export async function getDocumentForUser(
  documentId: string,
  userId: string,
  email: string | null | undefined,
  required: DocumentPermission = "VIEW",
) {
  return prisma.document.findFirst({
    where: {
      id: documentId,
      AND: documentAccessWhere(userId, email, required),
    },
  });
}

export async function getCommentForUser(
  commentId: string,
  userId: string,
  email: string | null | undefined,
  required: DocumentPermission,
) {
  return prisma.comment.findFirst({
    where: {
      id: commentId,
      document: documentAccessWhere(userId, email, required),
    },
    include: { suggestion: true },
  });
}

export async function getSuggestionForUser(
  suggestionId: string,
  userId: string,
  email: string | null | undefined,
  required: DocumentPermission,
) {
  return prisma.suggestion.findFirst({
    where: {
      id: suggestionId,
      comment: {
        document: documentAccessWhere(userId, email, required),
      },
    },
    include: { comment: true },
  });
}

export function effectiveDocumentPermission({
  ownerId,
  userId,
  collaboratorPermission,
  linkPermission,
}: {
  ownerId: string;
  userId: string;
  collaboratorPermission?: DocumentPermission | null;
  linkPermission?: DocumentPermission | null;
}): DocumentPermission {
  return ownerId === userId
    ? "FULL"
    : strongestDocumentPermission(collaboratorPermission, linkPermission);
}
