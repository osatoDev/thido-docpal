"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getOrCreateBlankDocument } from "@/lib/blankDocument";

async function createReadyDocument(startedFromPaste: boolean) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/");
  }

  const document = await getOrCreateBlankDocument(session.user.id);

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
