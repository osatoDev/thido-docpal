CREATE TYPE "FeedbackCategory" AS ENUM ('PROBLEM', 'IDEA', 'QUESTION', 'OTHER');
CREATE TYPE "FeedbackThreadStatus" AS ENUM ('OPEN', 'CLOSED');
CREATE TYPE "FeedbackAuthorType" AS ENUM ('USER', 'FOUNDER');

CREATE TABLE "FeedbackThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "FeedbackCategory" NOT NULL DEFAULT 'OTHER',
    "status" "FeedbackThreadStatus" NOT NULL DEFAULT 'OPEN',
    "currentPath" TEXT,
    "responseDueAt" TIMESTAMP(3),
    "firstRespondedAt" TIMESTAMP(3),
    "founderNotifiedAt" TIMESTAMP(3),
    "lastUserMessageAt" TIMESTAMP(3),
    "lastFounderMessageAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeedbackThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeedbackMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorType" "FeedbackAuthorType" NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedbackMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeedbackThread_userId_key" ON "FeedbackThread"("userId");
CREATE INDEX "FeedbackThread_status_responseDueAt_idx" ON "FeedbackThread"("status", "responseDueAt");
CREATE INDEX "FeedbackThread_updatedAt_idx" ON "FeedbackThread"("updatedAt");
CREATE INDEX "FeedbackMessage_threadId_createdAt_idx" ON "FeedbackMessage"("threadId", "createdAt");
CREATE INDEX "FeedbackMessage_authorId_idx" ON "FeedbackMessage"("authorId");

ALTER TABLE "FeedbackThread"
ADD CONSTRAINT "FeedbackThread_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackMessage"
ADD CONSTRAINT "FeedbackMessage_threadId_fkey"
FOREIGN KEY ("threadId") REFERENCES "FeedbackThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedbackMessage"
ADD CONSTRAINT "FeedbackMessage_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
