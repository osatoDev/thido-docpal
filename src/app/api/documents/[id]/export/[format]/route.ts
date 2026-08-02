import type { JSONContent } from "@tiptap/react";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { getDocumentForUser } from "@/lib/documentAuth";
import {
  createPdfDocument,
  createWordDocument,
  safeDownloadName,
} from "@/lib/documentExport";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string; format: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();
  if (!checkRateLimit(`document-export:${session.user.id}`, 20, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many downloads. Try again later." },
      { status: 429 },
    );
  }

  const { id, format } = await params;
  if (format !== "docx" && format !== "pdf") {
    return NextResponse.json({ error: "Unsupported format." }, { status: 404 });
  }
  const document = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "VIEW",
  );
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const content =
    document.content && typeof document.content === "object"
      ? (document.content as JSONContent)
      : null;
  try {
    const file =
      format === "docx"
        ? await createWordDocument({
            documentId: id,
            title: document.title,
            content,
          })
        : await createPdfDocument({
            documentId: id,
            title: document.title,
            content,
          });
    const filename = `${safeDownloadName(document.title)}.${format}`;
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type":
          format === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Unable to export document", error);
    await reportServerError(error, {
      source: "document-export",
      operation: format,
      documentId: id,
    });
    return NextResponse.json(
      { error: `Could not create the ${format.toUpperCase()} file.` },
      { status: 500 },
    );
  }
}
