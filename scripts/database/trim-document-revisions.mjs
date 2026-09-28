/**
 * One-time, owner-requested cleanup, independent of scheduled retention:
 * keep the highest 100 revision numbers per document, including keep-all docs.
 * Dry run: node scripts/database/trim-document-revisions.mjs
 * Apply:   node scripts/database/trim-document-revisions.mjs --apply
 * Loads the configured .env; never prints credentials or document content.
 */
import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("No database connection configured.");
const target = new URL(url);
const prisma = new PrismaClient({ datasources: { db: { url } } });
const apply = process.argv.includes("--apply");

try {
  console.log(JSON.stringify({ mode: apply ? "apply" : "dry-run", host: target.hostname, database: target.pathname.slice(1) }));
  const candidates = await prisma.$queryRaw`
    SELECT "documentId", COUNT(*)::int AS count
    FROM "DocumentRevision"
    GROUP BY "documentId" HAVING COUNT(*) > 100
    ORDER BY "documentId"
  `;
  console.log(JSON.stringify({
    documentsOverLimit: candidates.length,
    revisionsToDelete: candidates.reduce((sum, row) => sum + row.count - 100, 0),
  }));
  if (apply && candidates.length) {
    const result = await prisma.$transaction(async tx => {
      await tx.$executeRawUnsafe("SET LOCAL lock_timeout = '10s'");
      const ids = candidates.map(row => row.documentId);
      // Same parent-row locks used by saves, restores, and scheduled pruning.
      await tx.$queryRaw`
        SELECT "id" FROM "Document" WHERE "id" IN (${Prisma.join(ids)})
        ORDER BY "id" FOR UPDATE
      `;
      const survivors = await tx.$queryRaw`
        SELECT "id" FROM (
          SELECT "id", ROW_NUMBER() OVER (
            PARTITION BY "documentId" ORDER BY "revision" DESC
          ) AS position
          FROM "DocumentRevision" WHERE "documentId" IN (${Prisma.join(ids)})
        ) ranked WHERE position <= 100 ORDER BY "id"
      `;
      const deleted = await tx.$executeRaw`
        WITH ranked AS (
          SELECT "id", ROW_NUMBER() OVER (
            PARTITION BY "documentId" ORDER BY "revision" DESC
          ) AS position
          FROM "DocumentRevision" WHERE "documentId" IN (${Prisma.join(ids)})
        )
        DELETE FROM "DocumentRevision" r USING ranked
        WHERE r."id" = ranked."id" AND ranked.position > 100
      `;
      const remaining = await tx.$queryRaw`
        SELECT "id" FROM "DocumentRevision"
        WHERE "documentId" IN (${Prisma.join(ids)}) ORDER BY "id"
      `;
      if (JSON.stringify(survivors) !== JSON.stringify(remaining)) {
        throw new Error("Survivor verification failed; rolling back.");
      }
      return { revisionsDeleted: deleted, revisionsRetained: remaining.length, retainedNewestVerified: true };
    }, { timeout: 60000, maxWait: 10000 });
    console.log(JSON.stringify({ committed: true, ...result }));
  }
  const [verification] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS "documentsOverLimit",
           COALESCE(SUM(count - 100), 0)::int AS "excessRevisions"
    FROM (
      SELECT COUNT(*) AS count FROM "DocumentRevision"
      GROUP BY "documentId" HAVING COUNT(*) > 100
    ) counts
  `;
  console.log(JSON.stringify({ verification }));
} finally {
  await prisma.$disconnect();
}
