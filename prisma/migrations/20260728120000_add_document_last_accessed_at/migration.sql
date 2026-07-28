ALTER TABLE "Document"
ADD COLUMN "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Document"
SET "lastAccessedAt" = "updatedAt";
