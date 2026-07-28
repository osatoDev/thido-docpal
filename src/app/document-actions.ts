"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function createReadyDocument(startedFromPaste: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/");
  }

  const document = await prisma.document.create({
    data: {
      ownerId: session.user.id,
      title: "Untitled Document",
      status: "READY",
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
