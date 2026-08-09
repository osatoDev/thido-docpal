ALTER TABLE "Document"
ADD COLUMN "titleManuallySet" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Document"
SET "titleManuallySet" = true
WHERE "title" <> 'Untitled Document'
  AND "title" !~ '^Untitled Document — [0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2} UTC$';
