import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { documentAccessWhere } from "@/lib/documentAuth";
import { initialRevisionData } from "@/lib/documentRevisions";
import { sendAdminNewDocumentNotification } from "@/lib/email";
import { reportServerError } from "@/lib/rollbar/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const documents = await prisma.document.findMany({
    where: {
      AND: [
        documentAccessWhere(session.user.id),
        { isPlaceholder: false },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const body = await request.json().catch(() => ({}));
  const hasRequestedTitle =
    typeof body.title === "string" && Boolean(body.title.trim());
  const title = hasRequestedTitle
    ? body.title.trim().slice(0, 200)
    : "Untitled Document";

  const document = await prisma.document.create({
    data: {
      title,
      titleManuallySet: hasRequestedTitle,
      ownerId: session.user.id,
      revisions: {
        create: initialRevisionData({ title, actorId: session.user.id }),
      },
    },
    select: { id: true },
  });

  if (session.user.email) {
    try {
      await sendAdminNewDocumentNotification({
        documentId: document.id,
        title,
        ownerName: session.user.name ?? null,
        ownerEmail: session.user.email,
      });
    } catch (error) {
      console.error("Unable to send new document notification", error);
      await reportServerError(error, {
        source: "documents",
        operation: "notify-new-document",
      });
    }
  }

  return NextResponse.json({ documentId: document.id }, { status: 201 });
}
