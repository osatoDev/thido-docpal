import {
  DocumentRevisionSource,
  Prisma,
  type Document,
} from "@prisma/client";

const USER_REVISION_WINDOW_MS = 2 * 60_000;

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
        id: true,
        source: true,
        actorId: true,
        createdAt: true,
      },
    });
    const mayCoalesce =
      latest?.source === DocumentRevisionSource.USER &&
      latest.actorId === (actorId ?? null) &&
      latest.createdAt.getTime() > Date.now() - USER_REVISION_WINDOW_MS;

    if (mayCoalesce) {
      return transaction.documentRevision.update({
        where: { id: latest.id },
        data: {
          revision: document.revision,
          title: document.title,
          content: revisionContent(document.content),
        },
      });
    }
  }

  return transaction.documentRevision.create({
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
