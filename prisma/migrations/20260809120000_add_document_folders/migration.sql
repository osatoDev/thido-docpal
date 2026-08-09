CREATE TABLE "DocumentFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentFolder_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Document"
ADD COLUMN "folderId" TEXT;

CREATE UNIQUE INDEX "DocumentFolder_ownerId_nameKey_key"
ON "DocumentFolder"("ownerId", "nameKey");

CREATE INDEX "DocumentFolder_ownerId_name_idx"
ON "DocumentFolder"("ownerId", "name");

CREATE INDEX "Document_folderId_idx"
ON "Document"("folderId");

ALTER TABLE "DocumentFolder"
ADD CONSTRAINT "DocumentFolder_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Document"
ADD CONSTRAINT "Document_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
