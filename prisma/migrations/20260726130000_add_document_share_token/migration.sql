-- A nullable bearer token enables owner-controlled, read-only document links.
-- Setting the value back to NULL revokes access immediately.
ALTER TABLE "Document"
ADD COLUMN "shareToken" TEXT;

CREATE UNIQUE INDEX "Document_shareToken_key"
ON "Document"("shareToken");
