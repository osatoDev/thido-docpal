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
 * Sends each opted-in person their plan for their own local day, once per
 * day. Vercel Hobby runs this once a day within the 05:00 UTC hour, which is
 * 6 to 7 in the morning in Berlin in winter.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const recipients = await prisma.userSettings.findMany({
    where: { dailyPlanEmail: true, user: { email: { not: null } } },
    select: {
      userId: true,
      timeZone: true,
      dailyPlanEmailSentDay: true,
      user: { select: { email: true, planDocument: { select: { content: true } } } },
    },
  });

  let sent = 0;
  for (const recipient of recipients) {
    const day = localDay(now, recipient.timeZone);
    const email = recipient.user.email;
    if (!email || recipient.dailyPlanEmailSentDay === day) continue;
    try {
      if (sent > 0) await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
      await sendDailyPlanEmail({
        email,
        userId: recipient.userId,
        day,
        summary: dailyPlanSummary(recipient.user.planDocument?.content ?? null, day),
      });
      await prisma.userSettings.update({
        where: { userId: recipient.userId },
        data: { dailyPlanEmailSentDay: day },
      });
      sent += 1;
    } catch (error) {
      console.error("Unable to send daily plan email", error);
      await reportServerError(error, {
        source: "cron",
        operation: "daily-plan-email",
        userId: recipient.userId,
      });
    }
  }

  return NextResponse.json({ recipients: recipients.length, sent });
}
