import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getOwnedDocument } from "@/lib/documentAuth";
import { generateFollowupQuestions } from "@/lib/ai/generateFollowups";
import { checkRateLimit } from "@/lib/rateLimit";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
    return NextResponse.json(
      { error: "Too many AI requests — please slow down" },
      { status: 429 },
    );
  }

  const { id } = await params;
  const document = await getOwnedDocument(id, session.user.id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const followups = await generateFollowupQuestions(id);
    return NextResponse.json({ followups });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate follow-ups";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
