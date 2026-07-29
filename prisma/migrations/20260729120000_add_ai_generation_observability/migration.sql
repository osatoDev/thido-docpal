CREATE TYPE "AiFeature" AS ENUM (
    'DOCUMENT_FOLLOWUPS',
    'DOCUMENT_GENERATE',
    'COMMENT_RESPOND'
);

CREATE TYPE "AiGenerationStatus" AS ENUM (
    'PENDING',
    'SUCCEEDED',
    'FAILED'
);

CREATE TABLE "AiGeneration" (
    "id" TEXT NOT NULL,
    "feature" "AiFeature" NOT NULL,
    "status" "AiGenerationStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'anthropic',
    "model" TEXT NOT NULL,
    "userId" TEXT,
    "documentId" TEXT,
    "commentId" TEXT,
    "providerRequestId" TEXT,
    "environment" TEXT,
    "stopReason" TEXT,
    "serviceTier" TEXT,
    "inferenceGeo" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "latencyMs" INTEGER,
    "firstTokenMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "reasoningTokens" INTEGER,
    "cacheCreationTokens" INTEGER,
    "cacheCreation5mTokens" INTEGER,
    "cacheCreation1hTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "estimatedCostMicroUsd" BIGINT,
    "priceVersion" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGeneration_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiGeneration_feature_startedAt_idx"
ON "AiGeneration"("feature", "startedAt");

CREATE INDEX "AiGeneration_status_startedAt_idx"
ON "AiGeneration"("status", "startedAt");

CREATE INDEX "AiGeneration_userId_startedAt_idx"
ON "AiGeneration"("userId", "startedAt");

CREATE INDEX "AiGeneration_documentId_idx"
ON "AiGeneration"("documentId");

CREATE INDEX "AiGeneration_commentId_idx"
ON "AiGeneration"("commentId");

CREATE INDEX "AiGeneration_providerRequestId_idx"
ON "AiGeneration"("providerRequestId");

ALTER TABLE "AiGeneration"
ADD CONSTRAINT "AiGeneration_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiGeneration"
ADD CONSTRAINT "AiGeneration_documentId_fkey"
FOREIGN KEY ("documentId") REFERENCES "Document"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AiGeneration"
ADD CONSTRAINT "AiGeneration_commentId_fkey"
FOREIGN KEY ("commentId") REFERENCES "Comment"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
