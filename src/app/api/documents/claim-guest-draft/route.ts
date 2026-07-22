import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { guestDraftSchema, toInitialPromptAnswers } from "@/lib/guestDraft";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  if (!checkRateLimit(`guest-draft-claim:${session.user.id}`, 20, 60 * 60_000)) {
    return NextResponse.json(
      { error: "Too many document creation attempts. Try again later." },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = guestDraftSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "The temporary outline is invalid or incomplete." },
      { status: 400 },
    );
  }

  const result = await prisma.$transaction(async (transaction) => {
    const document = await transaction.document.upsert({
      where: { guestDraftId: parsed.data.draftId },
      update: {},
      create: {
        guestDraftId: parsed.data.draftId,
        ownerId: session.user.id,
        promptAnswers: {
          create: toInitialPromptAnswers(parsed.data).map((answer) => ({
            ...answer,
            stage: "INITIAL" as const,
          })),
        },
      },
      select: { id: true, ownerId: true },
    });

    return document.ownerId === session.user.id ? document : null;
  });

  if (!result) {
    return NextResponse.json(
      { error: "This temporary outline cannot be claimed." },
      { status: 409 },
    );
  }

  return NextResponse.json({ documentId: result.id }, { status: 201 });
}
