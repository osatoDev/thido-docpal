import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documentAuth";
import { parseScheduleEntry } from "@/lib/ai/planner";
import { validDay } from "@/lib/documentDays";
import { AiAllowanceExceededError } from "@/lib/entitlements";
import { isTimeZone } from "@/lib/planFeedbackPolicy";
import { checkRateLimit } from "@/lib/rateLimit";
import { aiAllowanceExceededResponse, unauthorizedResponse } from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

const MAX_ENTRY_LENGTH = 500;

/**
 * Reads a natural-language entry ("dentist next Tue 3pm") and returns the day,
 * time and task text. The editor writes the task into the document itself so
 * the change goes through normal autosave, undo and conflict handling.
 */
export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text || text.length > MAX_ENTRY_LENGTH) {
    return NextResponse.json({ error: `Write a task of up to ${MAX_ENTRY_LENGTH} characters.` }, { status: 400 });
  }
  if (!validDay(body.today) || !isTimeZone(body.timeZone)) {
    return NextResponse.json({ error: "Missing your local date or time zone." }, { status: 400 });
  }

  if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
    return NextResponse.json({ error: "Too many AI requests. Please slow down." }, { status: 429 });
  }

  const { id } = await params;
  const document = await getDocumentForUser(id, session.user.id, session.user.email, "EDIT");
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const entry = await parseScheduleEntry({
      userId: session.user.id,
      documentId: id,
      text,
      today: body.today,
      timeZone: body.timeZone,
    });
    return NextResponse.json({ entry });
  } catch (error) {
    if (error instanceof AiAllowanceExceededError) return await aiAllowanceExceededResponse(error);
    await reportServerError(error, { source: "document-schedule", operation: "parse-failed", status: 502, documentId: id });
    return NextResponse.json({ error: "Thido couldn't schedule that. Try again." }, { status: 502 });
  }
}
