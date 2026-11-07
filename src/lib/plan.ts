import "server-only";

import { initialRevisionData } from "@/lib/documentRevisions";
import { prisma } from "@/lib/prisma";

export const PLAN_TITLE = "My plan";

/**
 * Each person has one plan: a document linked from `User.planDocumentId`.
 * The first call creates it empty; the editor adds today's day on first open
 * because only the browser knows the person's local date.
 */
export async function getOrCreatePlan(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planDocumentId: true },
  });
  if (user?.planDocumentId) return { id: user.planDocumentId };

  return prisma.$transaction(async (transaction) => {
    // Two first visits at once must not create two plans.
    await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const current = await transaction.user.findUnique({
      where: { id: userId },
      select: { planDocumentId: true },
    });
    if (current?.planDocumentId) return { id: current.planDocumentId };

    const plan = await transaction.document.create({
      data: {
        ownerId: userId,
        title: PLAN_TITLE,
        titleManuallySet: true,
        status: "READY",
        revisions: {
          create: initialRevisionData({ title: PLAN_TITLE, actorId: userId }),
        },
      },
      select: { id: true },
    });
    await transaction.user.update({
      where: { id: userId },
      data: { planDocumentId: plan.id },
    });
    return plan;
  });
}
