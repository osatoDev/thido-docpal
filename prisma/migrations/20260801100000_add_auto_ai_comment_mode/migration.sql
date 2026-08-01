ALTER TABLE "UserSettings"
ALTER COLUMN "aiCommentMode" DROP DEFAULT;

-- PostgreSQL cannot use a newly added enum value in the same transaction, so
-- replace the enum before changing existing rows to the new AUTO value.
ALTER TYPE "AICommentMode" RENAME TO "AICommentMode_old";
CREATE TYPE "AICommentMode" AS ENUM ('PROPOSE', 'AUTO', 'AUTO_APPLY');

ALTER TABLE "UserSettings"
ALTER COLUMN "aiCommentMode" TYPE "AICommentMode"
USING "aiCommentMode"::text::"AICommentMode";

DROP TYPE "AICommentMode_old";

ALTER TABLE "UserSettings"
ALTER COLUMN "aiCommentMode" SET DEFAULT 'AUTO';

-- PROPOSE was the previous implicit default. Move those beta accounts to the
-- new product default while preserving explicit AUTO_APPLY preferences.
UPDATE "UserSettings"
SET "aiCommentMode" = 'AUTO'
WHERE "aiCommentMode" = 'PROPOSE';
