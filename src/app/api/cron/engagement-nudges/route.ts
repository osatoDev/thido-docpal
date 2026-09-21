import { NextResponse } from "next/server";

import {
  isWithinActivationNudgeWindow,
  isWithinReactivationNudgeWindow,
} from "@/lib/engagementNudges";
import {
  sendActivationNudgeEmail,
  sendReactivationNudgeEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const activationCandidates = (
    await prisma.user.findMany({
      where: {
        email: { not: null },
        activationNudgeSentAt: null,
        documents: { none: { isPlaceholder: false } },
      },
      select: { id: true, email: true, name: true, createdAt: true },
    })
  ).filter((user) => isWithinActivationNudgeWindow(user.createdAt, now));

  let activationSent = 0;
  for (const user of activationCandidates) {
    if (!user.email) continue;
    try {
      await sendActivationNudgeEmail({ email: user.email, name: user.name });
      await prisma.user.update({
        where: { id: user.id },
        data: { activationNudgeSentAt: now },
      });
      activationSent += 1;
    } catch (error) {
      console.error("Unable to send activation nudge email", error);
      await reportServerError(error, {
        source: "cron",
        operation: "activation-nudge",
        userId: user.id,
      });
    }
  }

  const reactivationCandidates = (
    await prisma.user.findMany({
      where: {
        email: { not: null },
        reactivationNudgeSentAt: null,
        documents: { some: { isPlaceholder: false } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        documents: {
          where: { isPlaceholder: false },
          orderBy: { updatedAt: "desc" },
          take: 1,
          select: { id: true, title: true, updatedAt: true },
        },
      },
    })
  ).flatMap((user) => {
    const document = user.documents[0];
    if (!user.email || !document) return [];
    if (!isWithinReactivationNudgeWindow(document.updatedAt, now)) return [];
    return [{ id: user.id, email: user.email, name: user.name, document }];
  });

  let reactivationSent = 0;
  for (const user of reactivationCandidates) {
    try {
      await sendReactivationNudgeEmail({
        email: user.email,
        name: user.name,
        documentId: user.document.id,
        title: user.document.title,
      });
      await prisma.user.update({
        where: { id: user.id },
        data: { reactivationNudgeSentAt: now },
      });
      reactivationSent += 1;
    } catch (error) {
      console.error("Unable to send reactivation nudge email", error);
      await reportServerError(error, {
        source: "cron",
        operation: "reactivation-nudge",
        userId: user.id,
      });
    }
  }

  return NextResponse.json({
    activationCandidates: activationCandidates.length,
    activationSent,
    reactivationCandidates: reactivationCandidates.length,
    reactivationSent,
  });
}
