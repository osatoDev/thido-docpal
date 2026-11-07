import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documentAuth";
import { answerPlanRequest } from "@/lib/ai/planner";
import { validDay } from "@/lib/documentDays";
import { AiAllowanceExceededError } from "@/lib/entitlements";
import { isTimeZone } from "@/lib/planFeedbackPolicy";
import { checkRateLimit } from "@/lib/rateLimit";
import { aiAllowanceExceededResponse, unauthorizedResponse } from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";

// Web search plus several model steps can take a minute or more.
export const maxDuration = 300;

type Params = { params: Promise<{ id: string }> };

const MAX_REQUEST_LENGTH = 500;
const MAX_PLAN_LENGTH = 8_000;

/**
 * Answers a request ("list 10 cinemas near the venue, I'm driving") with web
 * search and the day's plan as context. Nothing is written to the plan here:
 * the user picks options in the browser.
 */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  const plan = typeof body.plan === "string" ? body.plan.slice(0, MAX_PLAN_LENGTH) : "";
  if (!text || text.length > MAX_REQUEST_LENGTH) {
    return NextResponse.json({ error: `Write a request of up to ${MAX_REQUEST_LENGTH} characters.` }, { status: 400 });
  }
  if (!validDay(body.day) || !validDay(body.today) || !isTimeZone(body.timeZone)) {
    return NextResponse.json({ error: "Missing the day, your local date or time zone." }, { status: 400 });
  }

  if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many AI requests. Please slow down." }, { status: 429 });
  }

  const { id } = await params;
  const document = await getDocumentForUser(id, session.user.id);
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const answer = await answerPlanRequest({
      userId: session.user.id,
      documentId: id,
      request: text,
      day: body.day,
      today: body.today,
      timeZone: body.timeZone,
      plan,
    });
    return NextResponse.json({ answer: { day: body.day, ...answer } });
  } catch (error) {
    if (error instanceof AiAllowanceExceededError) return await aiAllowanceExceededResponse(error);
    await reportServerError(error, { source: "document-request", operation: "answer-failed", status: 502, documentId: id });
    return NextResponse.json({ error: "Thido couldn't look that up. Try again." }, { status: 502 });
  }
}
