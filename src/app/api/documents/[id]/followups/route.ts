import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDocumentForUser } from "@/lib/documentAuth";
import { generateFollowupQuestions } from "@/lib/ai/generateFollowups";
import { AiAllowanceExceededError } from "@/lib/entitlements";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  aiAllowanceExceededResponse,
  unauthorizedResponse,
} from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
    await reportServerError(new Error("Rate limited follow-up generation"), {
      source: "document-followups",
      operation: "rate-limited",
      status: 429,
    });
    return NextResponse.json(
      { error: "Too many AI requests. Please slow down." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const document = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (!document) {
    await reportServerError(new Error("Document not found"), {
      source: "document-followups",
      operation: "not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const followups = await generateFollowupQuestions(id);
    return NextResponse.json({ followups });
  } catch (error) {
    if (error instanceof AiAllowanceExceededError) {
      return await aiAllowanceExceededResponse(error);
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate follow-ups";
    await reportServerError(error, {
      source: "document-followups",
      operation: "generation-failed",
      status: 400,
      documentId: id,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
