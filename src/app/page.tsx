import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/documents/new");
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  if (settings.documentStartMode === "MOST_RECENT") {
    const latestDocument = await prisma.document.findFirst({
      where: { ownerId: session.user.id, status: "READY" },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    if (latestDocument) {
      redirect(`/documents/${latestDocument.id}/edit`);
    }
  }

  const document = await prisma.document.create({
    data: {
      ownerId: session.user.id,
      title: "Untitled Document",
      status: "READY",
    },
    select: { id: true },
  });

  redirect(`/documents/${document.id}/edit`);
}
