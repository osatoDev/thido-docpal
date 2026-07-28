import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { documentAccessWhere } from "@/lib/documentAuth";
import { prisma } from "@/lib/prisma";
import { createShareToken } from "@/lib/shareTokens";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
    },
    select: { shareToken: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!existing.shareToken) {
    await prisma.document.updateMany({
      where: {
        id,
        shareToken: null,
        AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
      },
      data: { shareToken: createShareToken() },
    });
  }

  const document = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
    },
    select: { shareToken: true },
  });

  if (!document?.shareToken) {
    return NextResponse.json(
      { error: "Could not create a share link" },
      { status: 500 },
    );
  }

  return NextResponse.json({ shareToken: document.shareToken });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const result = await prisma.document.updateMany({
    where: {
      id,
      AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
    },
    data: { shareToken: null },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
