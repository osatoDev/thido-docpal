import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { sendLinkAccessNotificationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";
import { isShareToken } from "@/lib/shareTokens";

type Params = { params: Promise<{ token: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const { token } = await params;
  if (!isShareToken(token)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const document = await prisma.document.findFirst({
    where: { shareToken: token, status: "READY" },
    select: {
      id: true,
      title: true,
      sharePermission: true,
      ownerId: true,
      owner: { select: { email: true } },
    },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOtherUserOnFullAccessLink =
    document.sharePermission === "FULL" && session.user.id !== document.ownerId;
  const existingAccess = isOtherUserOnFullAccessLink
    ? await prisma.documentLinkAccess.findUnique({
        where: {
          documentId_userId: {
            documentId: document.id,
            userId: session.user.id,
          },
        },
        select: { id: true },
      })
    : null;

  await prisma.documentLinkAccess.upsert({
    where: {
      documentId_userId: {
        documentId: document.id,
        userId: session.user.id,
      },
    },
    update: { lastAccessedAt: new Date() },
    create: { documentId: document.id, userId: session.user.id },
  });

  if (isOtherUserOnFullAccessLink && !existingAccess && document.owner.email) {
    try {
      await sendLinkAccessNotificationEmail({
        ownerEmail: document.owner.email,
        documentId: document.id,
        documentTitle: document.title,
        accessorName: session.user.name ?? null,
        accessorEmail: session.user.email ?? null,
      });
    } catch (error) {
      console.error("Unable to send full-access link notification", error);
      await reportServerError(error, {
        source: "share-access",
        operation: "notify-full-access",
      });
    }
  }

  return NextResponse.json({
    documentId: document.id,
    permission: document.sharePermission,
  });
}
