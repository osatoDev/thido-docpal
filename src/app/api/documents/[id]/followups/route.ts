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

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
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
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const followups = await generateFollowupQuestions(id);
    return NextResponse.json({ followups });
  } catch (error) {
    if (error instanceof AiAllowanceExceededError) {
      return aiAllowanceExceededResponse(error);
    }
    const message =
      error instanceof Error ? error.message : "Failed to generate follow-ups";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
