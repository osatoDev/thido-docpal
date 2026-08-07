"use server";

import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { createDefaultDocumentTitle } from "@/lib/documentPersistence";
import { prisma } from "@/lib/prisma";
import { initialRevisionData } from "@/lib/documentRevisions";

async function createReadyDocument(startedFromPaste: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/");
  }

  const defaultTitle = createDefaultDocumentTitle();
  const existingPlaceholder = await prisma.document.findFirst({
    where: {
      ownerId: session.user.id,
      status: "READY",
      isPlaceholder: true,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, revision: true },
  });
  const document =
    existingPlaceholder
      ? await prisma.document.update({
          where: { id: existingPlaceholder.id },
          data: {
            title: defaultTitle,
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
      : await prisma.document.create({
          data: {
            ownerId: session.user.id,
            title: defaultTitle,
            status: "READY",
            isPlaceholder: true,
            revisions: {
              create: initialRevisionData({
                title: defaultTitle,
                actorId: session.user.id,
              }),
            },
          },
          select: { id: true },
        });

  redirect(
    `/documents/${document.id}/edit${startedFromPaste ? "?start=paste" : ""}`,
  );
}

export async function createBlankDocument() {
  await createReadyDocument(false);
}

export async function createDocumentForPaste() {
  await createReadyDocument(true);
}
