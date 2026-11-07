import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documentAuth";
import { generatePlanFeedback } from "@/lib/ai/planner";
import { validDay } from "@/lib/documentDays";
import { AiAllowanceExceededError } from "@/lib/entitlements";
import {
  DEFAULT_PLAN_FEEDBACK_DAILY_LIMIT,
  shouldGiveAutoFeedback,
} from "@/lib/planFeedbackPolicy";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";
import { aiAllowanceExceededResponse, unauthorizedResponse } from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

const MAX_PLAN_LENGTH = 8_000;

/**
 * Feedback on one day's plan. MANUAL requests always run. AUTO requests follow
 * a new entry and run at random, capped per local day by the user's
 * `planFeedbackDailyLimit` setting; a skipped AUTO request costs nothing.
 */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();
  const userId = session.user.id;

  const body = await request.json().catch(() => ({}));
  const trigger = body.trigger === "AUTO" ? "AUTO" : "MANUAL";
  const plan = typeof body.plan === "string" ? body.plan.slice(0, MAX_PLAN_LENGTH) : "";
  const newEntry = typeof body.newEntry === "string" ? body.newEntry.slice(0, 500) : undefined;
  if (!validDay(body.day) || !validDay(body.today)) {
    return NextResponse.json({ error: "Choose a day to review." }, { status: 400 });
  }

  const { id } = await params;
  const document = await getDocumentForUser(id, userId);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (trigger === "AUTO") {
    const [settings, givenToday] = await Promise.all([
      prisma.userSettings.findUnique({ where: { userId }, select: { planFeedbackDailyLimit: true } }),
      prisma.planFeedback.count({ where: { userId, localDate: body.today, trigger: "AUTO" } }),
    ]);
    const dailyLimit = settings?.planFeedbackDailyLimit ?? DEFAULT_PLAN_FEEDBACK_DAILY_LIMIT;
    if (!shouldGiveAutoFeedback({ givenToday, dailyLimit })) {
      return NextResponse.json({ skipped: true });
    }
  }

  if (!checkRateLimit(`ai:${userId}`, 15, 60_000)) {
    if (trigger === "AUTO") return NextResponse.json({ skipped: true });
    return NextResponse.json({ error: "Too many AI requests. Please slow down." }, { status: 429 });
  }

  try {
    const feedback = await generatePlanFeedback({
      userId, documentId: id, day: body.day, today: body.today, plan, newEntry,
    });
    const saved = await prisma.planFeedback.create({
      data: { userId, documentId: id, day: body.day, localDate: body.today, trigger, feedback },
      select: { id: true, day: true, trigger: true, feedback: true, createdAt: true },
    });
    return NextResponse.json({ feedback: saved });
  } catch (error) {
    if (error instanceof AiAllowanceExceededError) {
      // Automatic feedback is a bonus; never surface an allowance error for it.
      if (trigger === "AUTO") return NextResponse.json({ skipped: true });
      return await aiAllowanceExceededResponse(error);
    }
    await reportServerError(error, { source: "plan-feedback", operation: "generation-failed", status: 502, documentId: id });
    if (trigger === "AUTO") return NextResponse.json({ skipped: true });
    return NextResponse.json({ error: "Thido couldn't review this day. Try again." }, { status: 502 });
  }
}
