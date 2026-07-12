import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedDocument } from "@/lib/documentAuth";

type Params = { params: Promise<{ id: string }> };

type AnswerInput = { order: number; question: string; answer: string };

export async function POST(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const document = await getOwnedDocument(id, session.user.id);
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : [];
  if (answers.length === 0) {
    return NextResponse.json({ error: "answers is required" }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.promptAnswer.deleteMany({
      where: { documentId: id, stage: "INITIAL" },
    }),
    prisma.promptAnswer.createMany({
      data: answers.map((a) => ({
        documentId: id,
        stage: "INITIAL" as const,
        order: a.order,
        question: a.question,
        answer: a.answer,
      })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
