CREATE TYPE "CommentAiStatus" AS ENUM (
    'NOT_REQUESTED',
    'PENDING',
    'SUCCEEDED',
    'FAILED'
);

ALTER TABLE "Comment"
ADD COLUMN "aiStatus" "CommentAiStatus" NOT NULL DEFAULT 'NOT_REQUESTED',
ADD COLUMN "aiStartedAt" TIMESTAMP(3),
ADD COLUMN "aiCompletedAt" TIMESTAMP(3);

CREATE INDEX "Comment_documentId_scope_aiStatus_idx"
ON "Comment"("documentId", "scope", "aiStatus");
