-- Normalize existing addresses before enforcing case-insensitive uniqueness.
-- This deliberately fails if the database already contains two users whose
-- emails differ only by case, so that an operator can resolve the collision
-- instead of silently merging accounts.
UPDATE "User"
SET "email" = LOWER(TRIM("email"))
WHERE "email" IS NOT NULL;

ALTER TABLE "User"
ADD COLUMN "passwordHash" TEXT;

CREATE UNIQUE INDEX "User_email_lower_key"
ON "User" (LOWER("email"))
WHERE "email" IS NOT NULL;
