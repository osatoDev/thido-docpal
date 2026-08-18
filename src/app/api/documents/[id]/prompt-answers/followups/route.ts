import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocumentForUser } from "@/lib/documentAuth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

type AnswerInput = { id: string; answer: string };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
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
      source: "prompt-answers",
      operation: "followups-not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : [];
  if (answers.length === 0) {
    await reportServerError(new Error("Missing prompt answers"), {
      source: "prompt-answers",
      operation: "followups-answers-required",
      status: 400,
      documentId: id,
    });
    return NextResponse.json({ error: "answers is required" }, { status: 400 });
  }

  await prisma.$transaction(
    answers.map((a) =>
      prisma.promptAnswer.updateMany({
        where: { id: a.id, documentId: id, stage: "FOLLOWUP" },
        data: { answer: a.answer },
      }),
    ),
  );

  return NextResponse.json({ ok: true });
}
