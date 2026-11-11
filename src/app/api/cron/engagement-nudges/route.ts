import { NextResponse } from "next/server";

import { isWithinActivationNudgeWindow } from "@/lib/engagementNudges";
import { sendActivationNudgeEmail } from "@/lib/email";
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
        // Everyone gets a plan on first visit, so "hasn't started" means
        // they have never opened it.
        planDocumentId: null,
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

  return NextResponse.json({
    activationCandidates: activationCandidates.length,
    activationSent,
  });
}
