import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";

import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { auth } from "@/lib/auth";
import { recordDocumentAccess } from "@/lib/documentAccess";
import { isCommentAiJobActive } from "@/lib/documentAiJobs";
import {
  documentAccessWhere,
  effectiveDocumentPermission,
  normalizeCollaboratorEmail,
} from "@/lib/documentAuth";
import { documentEditPath } from "@/lib/documentUrls";
import { prisma } from "@/lib/prisma";
import type { CommentAiProgress } from "@/lib/types";

export type EditDocumentSearchParams = Record<
  string,
  string | string[] | undefined
>;

export const getAccessibleEditDocument = cache(
  async (id: string, userId: string, email: string | null | undefined) =>
    prisma.document.findFirst({
      where: {
        id,
        AND: documentAccessWhere(userId, email, "VIEW"),
      },
      include: {
        collaborators: {
          orderBy: { createdAt: "asc" },
          select: { id: true, email: true, permission: true },
        },
        linkAccesses: {
          orderBy: { lastAccessedAt: "desc" },
          select: {
            userId: true,
            lastAccessedAt: true,
            user: { select: { name: true, email: true } },
          },
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
          },
        },
      },
    }),
);

function searchSuffix(searchParams: EditDocumentSearchParams) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    if (Array.isArray(value)) {
      for (const item of value) params.append(key, item);
    } else if (typeof value === "string") {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function EditDocumentPageContent({
  id,
  slugSegments,
  searchParams,
}: {
  id: string;
  slugSegments: readonly string[];
  searchParams: EditDocumentSearchParams;
}) {
  const suffix = searchSuffix(searchParams);
  const requestedPath = `${documentEditPath(id)}${
    slugSegments.length > 0
      ? `/${slugSegments.map(encodeURIComponent).join("/")}`
      : ""
  }`;
  const session = await auth();
  if (!session?.user?.id) {
    redirect(
      `/login?notice=sign-in-required&callbackUrl=${encodeURIComponent(`${requestedPath}${suffix}`)}`,
    );
  }

  const [document, settings] = await Promise.all([
    getAccessibleEditDocument(id, session.user.id, session.user.email),
    prisma.userSettings.findUnique({
      where: { userId: session.user.id },
      select: { checklistMoveControls: true },
    }),
  ]);

  if (!document) {
    notFound();
  }

  if (document.status !== "READY") {
    redirect(`/documents/${encodeURIComponent(id)}/wizard`);
  }

  const canonicalPath = documentEditPath(document.id, document.title);
  if (requestedPath !== canonicalPath) {
    redirect(`${canonicalPath}${suffix}`);
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
  const linkPermission =
    document.shareToken &&
    document.linkAccesses.some((access) => access.userId === session.user.id)
      ? document.sharePermission
      : null;
  const accessPermission = effectiveDocumentPermission({
    ownerId: document.ownerId,
    userId: session.user.id,
    collaboratorPermission,
    linkPermission,
  });
  const initialCommentProgress: Record<string, CommentAiProgress> =
    Object.fromEntries(
      document.comments.flatMap((comment) => {
        const isActive = isCommentAiJobActive(comment);
        return isActive || comment.aiStatus === "FAILED"
          ? [
              [
                comment.id,
                {
                  status: isActive ? "PENDING" : "FAILED",
                  startedAt: comment.aiStartedAt?.toISOString() ?? null,
                },
              ],
            ]
          : [];
      }),
    );
  const initialDocumentAiLocked = document.comments.some(
    (comment) =>
      comment.scope === "DOCUMENT" && isCommentAiJobActive(comment),
  );
  const start = searchParams.start;

  return (
    <TiptapEditor
      documentId={document.id}
      initialTitle={document.title}
      initialTitleManuallySet={document.titleManuallySet}
      initialCreatedAt={document.createdAt.toISOString()}
      initialContent={content}
      initialRevision={document.revision}
      initialComments={document.comments}
      initialCommentProgress={initialCommentProgress}
      initialDocumentAiLocked={initialDocumentAiLocked}
      initialShareToken={document.shareToken}
      initialSharePermission={document.sharePermission}
      initialLinkAccesses={
        accessPermission === "FULL"
          ? document.linkAccesses.map((access) => ({
              userId: access.userId,
              name: access.user.name,
              email: access.user.email,
              lastAccessedAt: access.lastAccessedAt.toISOString(),
            }))
          : []
      }
      initialCollaborators={
        accessPermission === "FULL" ? document.collaborators : []
      }
      accessPermission={accessPermission}
      currentUser={session.user}
      startedFromPaste={
        (Array.isArray(start) ? start[0] : start) === "paste"
      }
      checklistMoveControls={settings?.checklistMoveControls ?? true}
    />
  );
}
