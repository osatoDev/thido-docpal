"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { DEFAULT_DOCUMENT_TITLE } from "@/lib/documentPersistence";
import { prisma } from "@/lib/prisma";

async function createReadyDocument(startedFromPaste: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/");
  }

  const existingPlaceholder = await prisma.document.findFirst({
    where: {
      ownerId: session.user.id,
      status: "READY",
      isPlaceholder: true,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });
  const document =
    existingPlaceholder ??
    (await prisma.document.create({
      data: {
        ownerId: session.user.id,
        title: DEFAULT_DOCUMENT_TITLE,
        status: "READY",
        isPlaceholder: true,
      },
      select: { id: true },
    }));

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
