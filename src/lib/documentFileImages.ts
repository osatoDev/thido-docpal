import { get } from "@vercel/blob";
import sharp from "sharp";

import { prisma } from "@/lib/prisma";

const DOCUMENT_IMAGE_PATH = /^\/api\/document-images\/([^/?#]+)/;

export function documentImageIdFromSrc(src: unknown) {
  if (typeof src !== "string") return null;
  const match = DOCUMENT_IMAGE_PATH.exec(src);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export async function loadDocumentImageAsPng(
  documentId: string,
  src: unknown,
) {
  const imageId = documentImageIdFromSrc(src);
  if (!imageId) return null;

  const image = await prisma.documentImage.findFirst({
    where: { id: imageId, documentId },
    select: { blobUrl: true, alt: true },
  });
  if (!image) return null;

  const blob = await get(image.blobUrl, { access: "private" });
  if (!blob?.stream) return null;
  const original = Buffer.from(await new Response(blob.stream).arrayBuffer());
  const pipeline = sharp(original).rotate();
  const metadata = await pipeline.metadata();
  const width = metadata.width || 800;
  const height = metadata.height || 600;
  const maxWidth = 1200;
  const resizedWidth = Math.min(width, maxWidth);
  const resizedHeight = Math.max(1, Math.round((height / width) * resizedWidth));
  const data = await pipeline
    .resize({ width: resizedWidth, withoutEnlargement: true })
    .png()
    .toBuffer();

  return {
    data,
    width: resizedWidth,
    height: resizedHeight,
    alt: image.alt,
  };
}
