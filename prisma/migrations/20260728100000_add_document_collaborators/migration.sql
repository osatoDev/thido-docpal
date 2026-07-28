CREATE TYPE "DocumentPermission" AS ENUM ('VIEW', 'COMMENT', 'EDIT', 'FULL');

CREATE TABLE "DocumentCollaborator" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "permission" "DocumentPermission" NOT NULL DEFAULT 'VIEW',
    "invitedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentCollaborator_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentCollaborator_documentId_email_key"
ON "DocumentCollaborator"("documentId", "email");

CREATE INDEX "DocumentCollaborator_email_idx"
ON "DocumentCollaborator"("email");

CREATE INDEX "DocumentCollaborator_invitedById_idx"
ON "DocumentCollaborator"("invitedById");

ALTER TABLE "DocumentCollaborator"
ADD CONSTRAINT "DocumentCollaborator_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentCollaborator"
ADD CONSTRAINT "DocumentCollaborator_invitedById_fkey"
FOREIGN KEY ("invitedById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
