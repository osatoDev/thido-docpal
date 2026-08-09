CREATE TABLE "Spreadsheet" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Spreadsheet',
    "ownerId" TEXT NOT NULL,
    "folderId" TEXT,
    "content" JSONB NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Spreadsheet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Spreadsheet_ownerId_idx" ON "Spreadsheet"("ownerId");
CREATE INDEX "Spreadsheet_folderId_idx" ON "Spreadsheet"("folderId");

ALTER TABLE "Spreadsheet"
ADD CONSTRAINT "Spreadsheet_ownerId_fkey"
FOREIGN KEY ("ownerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Spreadsheet"
ADD CONSTRAINT "Spreadsheet_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "DocumentFolder"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
