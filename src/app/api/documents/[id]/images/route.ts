import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { getDocumentForUser } from "@/lib/documentAuth";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id: documentId } = await params;
  const document = await getDocumentForUser(documentId, session.user.id);
  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document-image",
      operation: "upload-not-found",
      status: 404,
      documentId,
    });
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    await reportServerError(new Error("No image file provided"), {
      source: "document-image",
      operation: "missing-file",
      status: 400,
      documentId,
    });
    return NextResponse.json({ error: "Choose an image to insert." }, { status: 400 });
  }
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) {
    return NextResponse.json(
      { error: "Use a JPEG, PNG, WebP, GIF, or AVIF photo." },
      { status: 415 },
    );
  }
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Photos must be smaller than 4 MB." },
      { status: 413 },
    );
  }

  const imageId = crypto.randomUUID();
  const pathname = `documents/${documentId}/${imageId}.${extension}`;
  let blobUrl: string | null = null;

  try {
    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: false,
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    blobUrl = blob.url;
    const alt = file.name.replace(/\.[^.]+$/, "").trim().slice(0, 200);
    const image = await prisma.documentImage.create({
      data: {
        id: imageId,
        documentId,
        uploadedById: session.user.id,
        blobUrl: blob.url,
        pathname: blob.pathname,
        contentType: file.type,
        size: file.size,
        alt,
      },
    });

    return NextResponse.json(
      {
        id: image.id,
        src: `/api/document-images/${encodeURIComponent(image.id)}`,
        alt: image.alt,
      },
      { status: 201 },
    );
  } catch (error) {
    if (blobUrl) await del(blobUrl).catch(() => undefined);
    console.error("Unable to upload document image", error);
    await reportServerError(error, {
      source: "document-image",
      operation: "upload",
      documentId,
    });
    return NextResponse.json(
      { error: "Could not add this photo. Try again." },
      { status: 500 },
    );
  }
}
