import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const userId = session.user.id;

  const [user, settings, documents, spreadsheets, folders, comments, feedbackThread] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          emailVerified: true,
          image: true,
          betaSeat: true,
          betaGrantedAt: true,
          createdAt: true,
          stripeCustomerId: true,
          stripeSubscriptionId: true,
          stripeSubscriptionStatus: true,
          stripeCurrentPeriodEnd: true,
          accounts: { select: { provider: true } },
        },
      }),
      prisma.userSettings.findUnique({
        where: { userId },
        select: {
          aiCommentMode: true,
          aiModel: true,
          documentStartMode: true,
          applicationStyle: true,
          checklistMoveControls: true,
        },
      }),
      prisma.document.findMany({
        where: { ownerId: userId, isPlaceholder: false },
        select: {
          id: true,
          title: true,
          status: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          folder: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.spreadsheet.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          title: true,
          content: true,
          createdAt: true,
          updatedAt: true,
          folder: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.documentFolder.findMany({
        where: { ownerId: userId },
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.comment.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          documentId: true,
          body: true,
          scope: true,
          quotedText: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.feedbackThread.findUnique({
        where: { userId },
        select: {
          id: true,
          category: true,
          status: true,
          messages: {
            select: {
              id: true,
              body: true,
              authorType: true,
              createdAt: true,
            },
            orderBy: { createdAt: "asc" },
          },
        },
      }),
    ]);

  if (!user) return unauthorizedResponse();

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      betaSeat: user.betaSeat,
      betaGrantedAt: user.betaGrantedAt,
      createdAt: user.createdAt,
      connectedSignInMethods: user.accounts.map((account) => account.provider),
    },
    billing: {
      stripeCustomerId: user.stripeCustomerId,
      stripeSubscriptionId: user.stripeSubscriptionId,
      stripeSubscriptionStatus: user.stripeSubscriptionStatus,
      stripeCurrentPeriodEnd: user.stripeCurrentPeriodEnd,
    },
    settings,
    folders,
    documents: documents.map((document) => ({
      ...document,
      folderName: document.folder?.name ?? null,
      folder: undefined,
    })),
    spreadsheets: spreadsheets.map((spreadsheet) => ({
      ...spreadsheet,
      folderName: spreadsheet.folder?.name ?? null,
      folder: undefined,
    })),
    commentsAuthored: comments,
    feedback: feedbackThread,
  };

  return new NextResponse(JSON.stringify(exportPayload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="thido-data-export-${userId}.json"`,
    },
  });
}
