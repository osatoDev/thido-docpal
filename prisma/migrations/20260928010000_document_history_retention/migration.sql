CREATE TABLE "DocumentHistoryRetention" (
    "documentId" TEXT NOT NULL,
    "keepAll" BOOLEAN NOT NULL DEFAULT false,
    "noticeId" TEXT,
    "noticeClaimedAt" TIMESTAMP(3),
    "noticeSentAt" TIMESTAMP(3),
    "noticeEmailId" TEXT,
    "deliveryConfirmedAt" TIMESTAMP(3),
    "deleteAfter" TIMESTAMP(3),
    "cutoffRevision" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentHistoryRetention_pkey" PRIMARY KEY ("documentId")
);

CREATE INDEX "DocumentHistoryRetention_keepAll_deleteAfter_idx"
    ON "DocumentHistoryRetention"("keepAll", "deleteAfter");

ALTER TABLE "DocumentHistoryRetention"
    ADD CONSTRAINT "DocumentHistoryRetention_documentId_fkey"
    FOREIGN KEY ("documentId") REFERENCES "Document"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
