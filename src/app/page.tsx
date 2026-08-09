import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getOrCreateBlankDocument } from "@/lib/blankDocument";
import { documentAccessWhere } from "@/lib/documentAuth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) redirect("/documents/new");

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
    select: { documentStartMode: true },
  });

  if (settings.documentStartMode === "MOST_RECENT") {
    const recentDocument = await prisma.document.findFirst({
      where: {
        AND: [
          documentAccessWhere(session.user.id, session.user.email, "VIEW"),
          { isPlaceholder: false },
        ],
      },
      orderBy: { lastAccessedAt: "desc" },
      select: { id: true, status: true },
    });

    if (recentDocument) {
      redirect(
        recentDocument.status === "READY"
          ? `/documents/${recentDocument.id}/edit`
          : `/documents/${recentDocument.id}/wizard`,
      );
    }
  }

  const document = await getOrCreateBlankDocument(session.user.id);
  redirect(`/documents/${document.id}/edit`);
}
