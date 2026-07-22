-- Make conversion of a locally stored guest outline idempotent. The value is
-- generated in the browser, but is not written until the user authenticates.
ALTER TABLE "Document"
ADD COLUMN "guestDraftId" TEXT;

CREATE UNIQUE INDEX "Document_guestDraftId_key"
ON "Document"("guestDraftId");
