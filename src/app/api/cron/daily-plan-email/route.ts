import { NextResponse } from "next/server";

import { generateDailyEmailInsights, type DailyEmailInsights } from "@/lib/ai/planner";
import { dailyPlanSummary, localDay, planContextText } from "@/lib/dailyPlanEmail";
import { sendDailyPlanEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

export const maxDuration = 300;

/** Resend's default limit is 2 emails a second. */
const SEND_GAP_MS = 600;
/** AI notes are written this many at a time, before any email goes out. */
const INSIGHT_CONCURRENCY = 5;
/**
 * After this, people still waiting get their email without the AI notes. A
 * call started just before it can take 80s more (40s timeout, one retry),
 * which still leaves time to send everything within maxDuration.
 */
const INSIGHT_BUDGET_MS = 120_000;

/** Runs `work` over `items`, at most `limit` at once. */
async function forEachLimited<T>(items: T[], limit: number, work: (item: T) => Promise<void>) {
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next];
      next += 1;
      await work(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

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
      planDocumentId: true,
      planDocument: { select: { content: true } },
      settings: { select: { timeZone: true, dailyPlanEmailSentDay: true } },
    },
  });

  const due = recipients
    .map((recipient) => ({ recipient, day: localDay(now, recipient.settings?.timeZone) }))
    .filter(({ recipient, day }) => recipient.email && recipient.settings?.dailyPlanEmailSentDay !== day);

  // The AI notes are a bonus: a failure or a slow run sends the email without them.
  const insights = new Map<string, DailyEmailInsights>();
  const insightDeadline = Date.now() + INSIGHT_BUDGET_MS;
  await forEachLimited(due, INSIGHT_CONCURRENCY, async ({ recipient, day }) => {
    if (Date.now() > insightDeadline || !recipient.planDocumentId) return;
    try {
      const notes = await generateDailyEmailInsights({
        userId: recipient.id,
        documentId: recipient.planDocumentId,
        today: day,
        plan: planContextText(recipient.planDocument?.content ?? null, day),
      });
      if (notes) insights.set(recipient.id, notes);
    } catch (error) {
      console.error("Unable to write daily email notes", error);
      await reportServerError(error, {
        source: "cron",
        operation: "daily-plan-email-insights",
        userId: recipient.id,
      });
    }
  });

  let sent = 0;
  for (const { recipient, day } of due) {
    if (!recipient.email) continue;
    try {
      if (sent > 0) await new Promise((resolve) => setTimeout(resolve, SEND_GAP_MS));
      await sendDailyPlanEmail({
        email: recipient.email,
        userId: recipient.id,
        day,
        summary: dailyPlanSummary(recipient.planDocument?.content ?? null, day),
        insights: insights.get(recipient.id) ?? null,
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

  return NextResponse.json({ recipients: recipients.length, sent, withNotes: insights.size });
}
