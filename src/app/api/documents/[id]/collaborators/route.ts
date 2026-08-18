import { DocumentPermission } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import {
  DOCUMENT_PERMISSIONS,
  getDocumentForUser,
  normalizeCollaboratorEmail,
} from "@/lib/documentAuth";
import { sendDocumentInvitationEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

function isPermission(value: unknown): value is DocumentPermission {
  return (
    typeof value === "string" &&
    DOCUMENT_PERMISSIONS.includes(value as DocumentPermission)
  );
}

export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id } = await params;
  const document = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document-collaborators",
      operation: "get-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const collaborators = await prisma.documentCollaborator.findMany({
    where: { documentId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, email: true, permission: true },
  });
  return NextResponse.json({ collaborators });
}

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();
  if (
    !checkRateLimit(
      `document-invitation:${session.user.id}`,
      20,
      60 * 60 * 1000,
    )
  ) {
    await reportServerError(new Error("Rate limited document invitation"), {
      source: "document-collaborators",
      operation: "rate-limited",
      status: 429,
    });
    return NextResponse.json(
      { error: "Too many invitations. Try again later." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: {
      id,
      AND: {
        OR: [
          { ownerId: session.user.id },
          ...(session.user.email
            ? [
                {
                  collaborators: {
                    some: {
                      email: normalizeCollaboratorEmail(session.user.email),
                      permission: "FULL" as const,
                    },
                  },
                },
              ]
            : []),
        ],
      },
    },
    select: {
      id: true,
      title: true,
      owner: { select: { email: true } },
    },
  });
  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document-collaborators",
      operation: "post-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const email =
    typeof body.email === "string"
      ? normalizeCollaboratorEmail(body.email)
      : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    await reportServerError(new Error("Invalid collaborator email"), {
      source: "document-collaborators",
      operation: "invalid-email",
      status: 400,
      documentId: id,
    });
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  if (!isPermission(body.permission)) {
    await reportServerError(new Error("Invalid collaborator permission"), {
      source: "document-collaborators",
      operation: "invalid-permission",
      status: 400,
      documentId: id,
    });
    return NextResponse.json(
      { error: "Choose a valid permission." },
      { status: 400 },
    );
  }
  if (
    email === normalizeCollaboratorEmail(session.user.email ?? "") ||
    email === normalizeCollaboratorEmail(document.owner.email ?? "")
  ) {
    await reportServerError(new Error("Collaborator already has access"), {
      source: "document-collaborators",
      operation: "self-invite",
      status: 400,
      documentId: id,
    });
    return NextResponse.json(
      { error: "This person already owns or has access to the document." },
      { status: 400 },
    );
  }

  const previous = await prisma.documentCollaborator.findUnique({
    where: { documentId_email: { documentId: id, email } },
  });
  const collaborator = await prisma.documentCollaborator.upsert({
    where: { documentId_email: { documentId: id, email } },
    update: { permission: body.permission, invitedById: session.user.id },
    create: {
      documentId: id,
      email,
      permission: body.permission,
      invitedById: session.user.id,
    },
    select: { id: true, email: true, permission: true, updatedAt: true },
  });

  try {
    await sendDocumentInvitationEmail({
      email,
      inviterName: session.user.name?.trim() || "A Thido user",
      documentTitle: document.title,
      documentId: id,
      permission: collaborator.permission,
      idempotencyKey: `document-invite-${collaborator.id}-${collaborator.updatedAt.getTime()}`,
    });
  } catch (error) {
    if (previous) {
      await prisma.documentCollaborator.update({
        where: { id: previous.id },
        data: {
          permission: previous.permission,
          invitedById: previous.invitedById,
        },
      });
    } else {
      await prisma.documentCollaborator.delete({
        where: { id: collaborator.id },
      });
    }
    console.error("Unable to send document invitation", error);
    await reportServerError(error, {
      source: "document-email",
      operation: "collaborator-invitation",
      route: "/api/documents/[id]/collaborators",
    });
    return NextResponse.json(
      { error: "The invitation email could not be sent. Try again." },
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      collaborator: {
        id: collaborator.id,
        email: collaborator.email,
        permission: collaborator.permission,
      },
    },
    { status: previous ? 200 : 201 },
  );
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();
  const { id } = await params;
  const document = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document-collaborators",
      operation: "patch-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.collaboratorId !== "string" || !isPermission(body.permission)) {
    await reportServerError(new Error("Invalid collaborator update request"), {
      source: "document-collaborators",
      operation: "patch-invalid-request",
      status: 400,
      documentId: id,
    });
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = await prisma.documentCollaborator.updateMany({
    where: { id: body.collaboratorId, documentId: id },
    data: { permission: body.permission },
  });
  if (!result.count) {
    await reportServerError(new Error("Collaborator not found"), {
      source: "document-collaborators",
      operation: "patch-collaborator-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();
  const { id } = await params;
  const document = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document-collaborators",
      operation: "delete-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.collaboratorId !== "string") {
    await reportServerError(new Error("Invalid collaborator delete request"), {
      source: "document-collaborators",
      operation: "delete-invalid-request",
      status: 400,
      documentId: id,
    });
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const result = await prisma.documentCollaborator.deleteMany({
    where: { id: body.collaboratorId, documentId: id },
  });
  if (!result.count) {
    await reportServerError(new Error("Collaborator not found"), {
      source: "document-collaborators",
      operation: "delete-collaborator-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
