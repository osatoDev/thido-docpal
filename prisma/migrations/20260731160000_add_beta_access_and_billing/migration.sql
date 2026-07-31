ALTER TABLE "User"
ADD COLUMN "betaSeat" INTEGER,
ADD COLUMN "betaGrantedAt" TIMESTAMP(3),
ADD COLUMN "stripeCustomerId" TEXT,
ADD COLUMN "stripeSubscriptionId" TEXT,
ADD COLUMN "stripePriceId" TEXT,
ADD COLUMN "stripeSubscriptionStatus" TEXT,
ADD COLUMN "stripeCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "stripeCancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false;

-- Existing accounts receive the first seats deterministically. If a database
-- unexpectedly contains more than 100 users, later accounts remain unseated
-- and cannot consume beta access.
WITH ranked_users AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt", "id") AS seat
    FROM "User"
)
UPDATE "User" AS users
SET
    "betaSeat" = ranked_users.seat,
    "betaGrantedAt" = CURRENT_TIMESTAMP
FROM ranked_users
WHERE users."id" = ranked_users."id"
  AND ranked_users.seat <= 100;

ALTER TABLE "User"
ADD CONSTRAINT "User_betaSeat_range_check"
CHECK ("betaSeat" IS NULL OR ("betaSeat" >= 1 AND "betaSeat" <= 100));

CREATE UNIQUE INDEX "User_betaSeat_key" ON "User"("betaSeat");
CREATE UNIQUE INDEX "User_stripeCustomerId_key" ON "User"("stripeCustomerId");
CREATE UNIQUE INDEX "User_stripeSubscriptionId_key" ON "User"("stripeSubscriptionId");

CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);
