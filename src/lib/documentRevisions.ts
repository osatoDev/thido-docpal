import {
  DocumentRevisionSource,
  Prisma,
  type Document,
} from "@prisma/client";

const USER_REVISION_WINDOW_MS = 24 * 60 * 60_000;

type RevisionDocument = Pick<
  Document,
  "id" | "revision" | "title" | "content"
>;

function revisionContent(content: Prisma.JsonValue | null) {
  return content === null
    ? Prisma.DbNull
    : (content as Prisma.InputJsonValue);
}

export async function recordDocumentRevision(
  transaction: Prisma.TransactionClient,
  document: RevisionDocument,
  {
    source,
    actorId,
    restoredFromRevision,
  }: {
    source: DocumentRevisionSource;
    actorId?: string | null;
    restoredFromRevision?: number | null;
  },
) {
  if (source === DocumentRevisionSource.USER) {
    const latest = await transaction.documentRevision.findFirst({
      where: { documentId: document.id },
      orderBy: { revision: "desc" },
      select: {
        source: true,
        createdAt: true,
      },
    });
    // Autosave persists the current document independently. History only
    // needs occasional immutable restore points, not another write per save.
    // The first user save after an AI/import/restore also starts a new point.
    if (
      latest?.source === DocumentRevisionSource.USER &&
      latest.createdAt.getTime() > Date.now() - USER_REVISION_WINDOW_MS
    ) {
      return null;
    }
  }

  return transaction.documentRevision.create({
    select: { id: true },
    data: {
      documentId: document.id,
      revision: document.revision,
      title: document.title,
      content: revisionContent(document.content),
      source,
      actorId: actorId ?? null,
      restoredFromRevision: restoredFromRevision ?? null,
    },
  });
}

export function initialRevisionData({
  title,
  actorId,
}: {
  title: string;
  actorId: string;
}) {
  return {
    revision: 0,
    title,
    source: DocumentRevisionSource.INITIAL,
    actorId,
  } as const;
}
