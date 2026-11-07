-- One plan per person: link each user to their plan document, and remove
-- folders and the document start-mode setting. DESTRUCTIVE: drops folder
-- names and assignments (documents themselves are kept).

-- DropForeignKey
ALTER TABLE "Document" DROP CONSTRAINT "Document_folderId_fkey";

-- DropForeignKey
ALTER TABLE "DocumentFolder" DROP CONSTRAINT "DocumentFolder_ownerId_fkey";

-- DropIndex
DROP INDEX "Document_folderId_idx";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "planDocumentId" TEXT;

-- AlterTable
ALTER TABLE "UserSettings" DROP COLUMN "documentStartMode";

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "folderId";

-- DropTable
DROP TABLE "DocumentFolder";

-- DropEnum
DROP TYPE "DocumentStartMode";

-- CreateIndex
CREATE UNIQUE INDEX "User_planDocumentId_key" ON "User"("planDocumentId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_planDocumentId_fkey" FOREIGN KEY ("planDocumentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

