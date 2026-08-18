import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import {
  DOCUMENT_PERMISSIONS,
  documentAccessWhere,
} from "@/lib/documentAuth";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";
import { createShareToken } from "@/lib/shareTokens";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const permission = DOCUMENT_PERMISSIONS.includes(body.permission)
    ? body.permission
    : "VIEW";
  const existing = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
    },
    select: { shareToken: true },
  });

  if (!existing) {
    await reportServerError(new Error("Document not found"), {
      source: "document-share",
      operation: "create-link-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!existing.shareToken) {
    await prisma.document.updateMany({
      where: {
        id,
        shareToken: null,
        AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
      },
      data: { shareToken: createShareToken(), sharePermission: permission },
    });
  } else {
    await prisma.document.updateMany({
      where: {
        id,
        AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
      },
      data: { sharePermission: permission },
    });
  }

  const document = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
    },
    select: { shareToken: true, sharePermission: true },
  });

  if (!document?.shareToken) {
    await reportServerError(
      new Error("Share token missing after create-or-update"),
      { source: "document-share", operation: "create-link", documentId: id },
    );
    return NextResponse.json(
      { error: "Could not create a share link" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    shareToken: document.shareToken,
    sharePermission: document.sharePermission,
  });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const result = await prisma.$transaction(async (transaction) => {
    const update = await transaction.document.updateMany({
      where: {
        id,
        AND: documentAccessWhere(session.user.id, session.user.email, "FULL"),
      },
      data: { shareToken: null, sharePermission: "VIEW" },
    });
    if (update.count > 0) {
      await transaction.documentLinkAccess.deleteMany({
        where: { documentId: id },
      });
    }
    return update;
  });

  if (result.count === 0) {
    await reportServerError(new Error("Document not found"), {
      source: "document-share",
      operation: "delete-link-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
