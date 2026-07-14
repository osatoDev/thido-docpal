CREATE TYPE "DocumentStartMode" AS ENUM ('NEW_DOCUMENT', 'MOST_RECENT');

ALTER TABLE "UserSettings"
ADD COLUMN "documentStartMode" "DocumentStartMode" NOT NULL DEFAULT 'NEW_DOCUMENT';
