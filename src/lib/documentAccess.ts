import "server-only";

import { after } from "next/server";

import { prisma } from "@/lib/prisma";

/**
 * Records a successful document open without delaying the response or touching
 * Document.updatedAt, which remains the content-modification timestamp.
 */
export function recordDocumentAccess(documentId: string) {
  after(async () => {
    try {
      await prisma.$executeRaw`
        UPDATE "Document"
        SET "lastAccessedAt" = NOW()
        WHERE "id" = ${documentId}
      `;
    } catch (error) {
      console.error("Unable to record document access", error);
    }
  });
}

export function recordSpreadsheetAccess(spreadsheetId: string) {
  after(async () => {
    try {
      await prisma.$executeRaw`
        UPDATE "Spreadsheet"
        SET "lastAccessedAt" = NOW()
        WHERE "id" = ${spreadsheetId}
      `;
    } catch (error) {
      console.error("Unable to record spreadsheet access", error);
    }
  });
}
