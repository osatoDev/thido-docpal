import { NextResponse } from "next/server";

import { dailyPlanSummary, localDay } from "@/lib/dailyPlanEmail";
import { sendDailyPlanEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

export const maxDuration = 300;

/** Resend's default limit is 2 emails a second. */
const SEND_GAP_MS = 600;

function isAuthorizedCronRequest(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Sends each person their plan for their own local day, once per day. Vercel
 * Hobby runs this once a day within the 05:00 UTC hour, which is 6 to 7 in
 * the morning in Berlin in winter.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  // On by default: people without a settings row get it too. Only people
  // with a plan, so nobody who never opened Thido gets an empty email.
  const recipients = await prisma.user.findMany({
    where: {
      email: { not: null },
      betaSeat: { not: null },
      planDocumentId: { not: null },
      OR: [{ settings: null }, { settings: { dailyPlanEmail: true } }],
    },
    select: {
      id: true,
      email: true,
      planDocument: { select: { content: true } },
      settings: { select: { timeZone: true, dailyPlanEmailSentDay: true } },
    },
  });

  let sent = 0;
  for (const recipient of recipients) {
    const day = localDay(now, recipient.settings?.timeZone);
    if (!recipient.email || recipient.settings?.dailyPlanEmailSentDay === day) continue;
    try {
      if (sent > 0) await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
      await sendDailyPlanEmail({
        email: recipient.email,
        userId: recipient.id,
        day,
        summary: dailyPlanSummary(recipient.planDocument?.content ?? null, day),
      });
      await prisma.userSettings.upsert({
        where: { userId: recipient.id },
        update: { dailyPlanEmailSentDay: day },
        create: { userId: recipient.id, dailyPlanEmailSentDay: day },
      });
      sent += 1;
    } catch (error) {
      console.error("Unable to send daily plan email", error);
      await reportServerError(error, {
        source: "cron",
        operation: "daily-plan-email",
        userId: recipient.id,
      });
    }
  }

  return NextResponse.json({ recipients: recipients.length, sent });
}
