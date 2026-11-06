import {
  DocumentRevisionSource,
  Prisma,
  type Document,
} from "@prisma/client";

const DAY_MS = 24 * 60 * 60_000;
const DAILY_RETENTION_DAYS = 30;
const WEEKLY_RETENTION_DAYS = 183;

type RevisionDocument = Pick<
  Document,
  "id" | "revision" | "title" | "content"
>;

type RetainedRevision = { id: string; revision: number; createdAt: Date };

function revisionContent(content: Prisma.JsonValue | null) {
  return content === null
    ? Prisma.DbNull
    : (content as Prisma.InputJsonValue);
}

function utcDay(date: Date) {
  return date.toISOString().slice(0, 10);
}

/**
 * History keeps one version per UTC day for the last 30 days, one per week
 * (Monday-based) until six months, then one per month. Versions from the
 * current day are all kept, so a restore or import can itself be undone
 * until the day is over.
 */
export function revisionRetentionBucket(createdAt: Date, now: Date) {
  const ageMs = now.getTime() - createdAt.getTime();
  if (ageMs < DAILY_RETENTION_DAYS * DAY_MS) return `day:${utcDay(createdAt)}`;
  if (ageMs < WEEKLY_RETENTION_DAYS * DAY_MS) {
    const daysSinceMonday = (createdAt.getUTCDay() + 6) % 7;
    const monday = new Date(createdAt.getTime() - daysSinceMonday * DAY_MS);
    return `week:${utcDay(monday)}`;
  }
  return `month:${createdAt.toISOString().slice(0, 7)}`;
}

/** The ids to delete so that only the newest revision in each bucket remains. */
export function revisionsToPrune(
  revisions: readonly RetainedRevision[],
  now: Date,
) {
  const seen = new Set<string>();
  const today = utcDay(now);
  return [...revisions]
    .sort((a, b) => b.revision - a.revision)
    .filter((revision) => {
      if (utcDay(revision.createdAt) === today) return false;
      const bucket = revisionRetentionBucket(revision.createdAt, now);
      if (seen.has(bucket)) return true;
      seen.add(bucket);
      return false;
    })
    .map((revision) => revision.id);
}

async function pruneDocumentRevisions(
  transaction: Prisma.TransactionClient,
  documentId: string,
  now: Date,
) {
  const revisions = await transaction.documentRevision.findMany({
    where: { documentId },
    select: { id: true, revision: true, createdAt: true },
  });
  const pruned = revisionsToPrune(revisions, now);
  if (pruned.length > 0) {
    await transaction.documentRevision.deleteMany({
      where: { id: { in: pruned } },
    });
  }
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
  const now = new Date();
  if (source === DocumentRevisionSource.USER) {
    const latest = await transaction.documentRevision.findFirst({
      where: { documentId: document.id },
      orderBy: { revision: "desc" },
      select: { id: true, source: true, createdAt: true },
    });
    // Saves on the same day keep refreshing that day's version, so each day
    // ends with the last state the user saved. The first save after an
    // import or restore starts a new version.
    if (
      latest?.source === DocumentRevisionSource.USER &&
      utcDay(latest.createdAt) === utcDay(now)
    ) {
      return transaction.documentRevision.update({
        where: { id: latest.id },
        select: { id: true },
        data: {
          revision: document.revision,
          title: document.title,
          content: revisionContent(document.content),
          actorId: actorId ?? null,
          createdAt: now,
        },
      });
    }
  }

  const created = await transaction.documentRevision.create({
    select: { id: true },
    data: {
      documentId: document.id,
      revision: document.revision,
      title: document.title,
      content: revisionContent(document.content),
      source,
      actorId: actorId ?? null,
      restoredFromRevision: restoredFromRevision ?? null,
      createdAt: now,
    },
  });
  await pruneDocumentRevisions(transaction, document.id, now);
  return created;
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
