ALTER TYPE "AiFeature" ADD VALUE 'TASK_SCHEDULE';
ALTER TYPE "AiFeature" ADD VALUE 'PLAN_FEEDBACK';

CREATE TYPE "PlanFeedbackTrigger" AS ENUM ('MANUAL', 'AUTO');

ALTER TABLE "UserSettings"
ADD COLUMN "planFeedbackDailyLimit" INTEGER NOT NULL DEFAULT 3;

CREATE TABLE "PlanFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "localDate" TEXT NOT NULL,
    "trigger" "PlanFeedbackTrigger" NOT NULL,
    "feedback" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanFeedback_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PlanFeedback_userId_localDate_trigger_idx" ON "PlanFeedback"("userId", "localDate", "trigger");
CREATE INDEX "PlanFeedback_documentId_day_idx" ON "PlanFeedback"("documentId", "day");

ALTER TABLE "PlanFeedback" ADD CONSTRAINT "PlanFeedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanFeedback" ADD CONSTRAINT "PlanFeedback_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
