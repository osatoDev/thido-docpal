import { get } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documentAuth";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";
import { isShareToken } from "@/lib/shareTokens";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const { id } = await params;
  const image = await prisma.documentImage.findUnique({
    where: { id },
    select: {
      blobUrl: true,
      contentType: true,
      size: true,
      documentId: true,
      document: { select: { shareToken: true } },
    },
  });
  if (!image) return new NextResponse(null, { status: 404 });

  const session = await auth();
  const sharedToken = new URL(request.url).searchParams.get("share");
  const mayViewAsMember = session?.user?.id
    ? Boolean(
        await getDocumentForUser(
          image.documentId,
          session.user.id,
          session.user.email,
          "VIEW",
        ),
      )
    : false;
  const mayViewAsGuest =
    Boolean(sharedToken) &&
    isShareToken(sharedToken!) &&
    image.document.shareToken === sharedToken;

  if (!mayViewAsMember && !mayViewAsGuest) {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const result = await get(image.blobUrl, { access: "private" });
    if (!result?.stream) return new NextResponse(null, { status: 404 });

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? image.contentType,
        "Content-Length": String(result.blob.size ?? image.size),
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to read document image", error);
    await reportServerError(error, {
      source: "document-image",
      operation: "read",
      imageId: id,
    });
    return new NextResponse(null, { status: 500 });
  }
}
