import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  documentAccessWhere,
  effectiveDocumentPermission,
  normalizeCollaboratorEmail,
} from "@/lib/documentAuth";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { recordDocumentAccess } from "@/lib/documentAccess";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ start?: string | string[] }>;
};

export default async function EditDocumentPage({ params, searchParams }: Props) {
  const session = await auth();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!session?.user?.id) {
    redirect(
      `/login?notice=sign-in-required&callbackUrl=${encodeURIComponent(`/documents/${id}/edit`)}`,
    );
  }

  const document = await prisma.document.findFirst({
    where: {
      id,
      AND: documentAccessWhere(session.user.id, session.user.email, "VIEW"),
    },
    include: {
      collaborators: {
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true, permission: true },
      },
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { name: true } },
          replies: {
            orderBy: { createdAt: "asc" },
            include: { author: { select: { name: true } } },
          },
          suggestion: true,
          aiGenerations: {
            where: {
              feature: "COMMENT_RESPOND",
              status: { in: ["PENDING", "FAILED"] },
            },
            orderBy: { startedAt: "desc" },
            take: 1,
            select: {
              status: true,
              startedAt: true,
            },
          },
        },
      },
    },
  });

  if (!document) {
    notFound();
  }

  if (document.status !== "READY") {
    redirect(`/documents/${id}/wizard`);
  }

  recordDocumentAccess(document.id);

  const content =
    document.content && typeof document.content === "object"
      ? (document.content as JSONContent)
      : null;
  const normalizedEmail = normalizeCollaboratorEmail(session.user.email ?? "");
  const collaboratorPermission = document.collaborators.find(
    (collaborator) => collaborator.email === normalizedEmail,
  )?.permission;
  const accessPermission = effectiveDocumentPermission({
    ownerId: document.ownerId,
    userId: session.user.id,
    collaboratorPermission,
  });
  const initialCommentProgress = Object.fromEntries(
    document.comments.flatMap(({ id: commentId, aiGenerations }) => {
      const progress = aiGenerations[0];
      return progress
        ? [
            [
              commentId,
              {
                status: progress.status,
                startedAt: progress.startedAt.toISOString(),
              },
            ],
          ]
        : [];
    }),
  );
  const comments = document.comments.map(({ aiGenerations, ...comment }) => {
    void aiGenerations;
    return comment;
  });

  return (
    <TiptapEditor
      documentId={document.id}
      initialTitle={document.title}
      initialContent={content}
      initialComments={comments}
      initialCommentProgress={initialCommentProgress}
      initialShareToken={document.shareToken}
      initialCollaborators={
        accessPermission === "FULL" ? document.collaborators : []
      }
      accessPermission={accessPermission}
      startedFromPaste={
        (Array.isArray(query.start) ? query.start[0] : query.start) === "paste"
      }
    />
  );
}
