import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";

import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { auth } from "@/lib/auth";
import { recordDocumentAccess } from "@/lib/documentAccess";
import { documentAccessWhere } from "@/lib/documentAuth";
import { documentEditPath } from "@/lib/documentUrls";
import { prisma } from "@/lib/prisma";

export function getEditorSettings(userId: string) {
  return prisma.userSettings.findUnique({
    where: { userId },
    select: { checklistMoveControls: true },
  });
}

export type EditDocumentSearchParams = Record<
  string,
  string | string[] | undefined
>;

export const getAccessibleEditDocument = cache(
  async (id: string, userId: string) =>
    prisma.document.findFirst({
      where: {
        id,
        AND: documentAccessWhere(userId),
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

  const [document, settings, user] = await Promise.all([
    getAccessibleEditDocument(id, session.user.id),
    getEditorSettings(session.user.id),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { planDocumentId: true },
    }),
  ]);

  if (!document) {
    notFound();
  }
  if (document.id === user?.planDocumentId) {
    redirect("/plan");
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

  return (
    <TiptapEditor
      documentId={document.id}
      initialTitle={document.title}
      initialTitleManuallySet={document.titleManuallySet}
      initialCreatedAt={document.createdAt.toISOString()}
      initialContent={content}
      initialRevision={document.revision}
      currentUser={session.user}
      checklistMoveControls={settings?.checklistMoveControls ?? true}
    />
  );
}
