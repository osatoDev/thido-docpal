import "server-only";

import { Prisma } from "@prisma/client";

import { createDefaultDocumentTitle } from "@/lib/documentPersistence";
import { prisma } from "@/lib/prisma";
import { initialRevisionData } from "@/lib/documentRevisions";

export async function getOrCreateBlankDocument(userId: string) {
  const defaultTitle = createDefaultDocumentTitle();
  const existingPlaceholder = await prisma.document.findFirst({
    where: {
      ownerId: userId,
      status: "READY",
      isPlaceholder: true,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, revision: true },
  });

  return existingPlaceholder
    ? prisma.document.update({
        where: { id: existingPlaceholder.id },
        data: {
          title: defaultTitle,
          titleManuallySet: false,
          content: Prisma.DbNull,
          revisions: {
            updateMany: {
              where: { revision: existingPlaceholder.revision },
              data: { title: defaultTitle, content: Prisma.DbNull },
            },
          },
        },
        select: { id: true },
      })
    : prisma.document.create({
        data: {
          ownerId: userId,
          title: defaultTitle,
          status: "READY",
          isPlaceholder: true,
          revisions: {
            create: initialRevisionData({ title: defaultTitle, actorId: userId }),
          },
        },
        select: { id: true },
      });
}
