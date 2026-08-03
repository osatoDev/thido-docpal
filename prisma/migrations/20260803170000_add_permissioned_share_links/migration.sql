ALTER TABLE "Document"
ADD COLUMN "sharePermission" "DocumentPermission" NOT NULL DEFAULT 'VIEW';

CREATE TABLE "DocumentLinkAccess" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLinkAccess_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DocumentLinkAccess_documentId_userId_key"
ON "DocumentLinkAccess"("documentId", "userId");

CREATE INDEX "DocumentLinkAccess_userId_idx"
ON "DocumentLinkAccess"("userId");

CREATE INDEX "DocumentLinkAccess_documentId_lastAccessedAt_idx"
ON "DocumentLinkAccess"("documentId", "lastAccessedAt");

ALTER TABLE "DocumentLinkAccess"
ADD CONSTRAINT "DocumentLinkAccess_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DocumentLinkAccess"
ADD CONSTRAINT "DocumentLinkAccess_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
