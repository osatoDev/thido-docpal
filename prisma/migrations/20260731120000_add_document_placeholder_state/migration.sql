-- Blank editor sessions need a durable id for routing and autosave, but they
-- should not appear in document lists until the owner saves meaningful work.
ALTER TABLE "Document"
ADD COLUMN "isPlaceholder" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Document_isPlaceholder_updatedAt_idx"
ON "Document"("isPlaceholder", "updatedAt");
