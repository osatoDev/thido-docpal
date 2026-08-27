-- CreateTable
CREATE TABLE "AiCreditCharge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" "AiFeature" NOT NULL,
    "model" TEXT NOT NULL,
    "credits" INTEGER NOT NULL,
    "plan" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "documentId" TEXT,
    "aiGenerationId" TEXT,
    "refundedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiCreditCharge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiCreditCharge_aiGenerationId_key" ON "AiCreditCharge"("aiGenerationId");

-- CreateIndex
CREATE INDEX "AiCreditCharge_userId_createdAt_idx" ON "AiCreditCharge"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiCreditCharge_userId_periodStart_idx" ON "AiCreditCharge"("userId", "periodStart");

-- CreateIndex
CREATE INDEX "AiCreditCharge_documentId_idx" ON "AiCreditCharge"("documentId");

-- AddForeignKey
ALTER TABLE "AiCreditCharge" ADD CONSTRAINT "AiCreditCharge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiCreditCharge" ADD CONSTRAINT "AiCreditCharge_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;
