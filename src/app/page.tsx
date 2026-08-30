import { redirect } from "next/navigation";

import { MarketingLanding } from "@/components/landing/MarketingLanding";
import { getOrCreateBlankDocument } from "@/lib/blankDocument";
import { getCurrentSession } from "@/lib/currentSession";
import { documentAccessWhere } from "@/lib/documentAuth";
import { documentEditPath } from "@/lib/documentUrls";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    return <MarketingLanding />;
  }

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
      select: { id: true, status: true, title: true },
    });

    if (recentDocument) {
      redirect(
        recentDocument.status === "READY"
          ? documentEditPath(recentDocument.id, recentDocument.title)
          : `/documents/${recentDocument.id}/wizard`,
      );
    }
  }

  const document = await getOrCreateBlankDocument(session.user.id);
  redirect(documentEditPath(document.id));
}
