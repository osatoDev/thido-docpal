-- CreateEnum
CREATE TYPE "DocumentRevisionSource" AS ENUM ('INITIAL', 'USER', 'AI', 'RESTORE', 'IMPORT');

-- AlterTable
ALTER TABLE "Document" ADD COLUMN "revision" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "DocumentRevision" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "source" "DocumentRevisionSource" NOT NULL,
    "actorId" TEXT,
    "restoredFromRevision" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentRevision_pkey" PRIMARY KEY ("id")
);

-- Preserve a recoverable baseline for every existing document.
INSERT INTO "DocumentRevision" (
    "id",
    "documentId",
    "revision",
    "title",
    "content",
    "source",
    "actorId",
    "createdAt"
)
SELECT
    'rev_' || md5(random()::text || clock_timestamp()::text || "id"),
    "id",
    0,
    "title",
    "content",
    'INITIAL'::"DocumentRevisionSource",
    "ownerId",
    "createdAt"
FROM "Document";

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRevision_documentId_revision_key" ON "DocumentRevision"("documentId", "revision");

-- CreateIndex
CREATE INDEX "DocumentRevision_documentId_createdAt_idx" ON "DocumentRevision"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentRevision_actorId_idx" ON "DocumentRevision"("actorId");

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRevision" ADD CONSTRAINT "DocumentRevision_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
