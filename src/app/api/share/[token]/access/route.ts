import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { prisma } from "@/lib/prisma";
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
    select: { id: true, sharePermission: true },
  });
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

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

  return NextResponse.json({
    documentId: document.id,
    permission: document.sharePermission,
  });
}
