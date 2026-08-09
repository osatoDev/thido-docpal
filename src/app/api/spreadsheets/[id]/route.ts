import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { prisma } from "@/lib/prisma";
import { normalizeSpreadsheetContent } from "@/lib/spreadsheet";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const baseRevision =
    Number.isInteger(body.baseRevision) && body.baseRevision >= 0
      ? (body.baseRevision as number)
      : null;
  if (baseRevision === null) {
    return NextResponse.json(
      { error: "A valid baseRevision is required." },
      { status: 400 },
    );
  }

  const data: { title?: string; content?: Prisma.InputJsonValue } = {};
  if (body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim()) {
      return NextResponse.json(
        { error: "Spreadsheet title cannot be empty." },
        { status: 400 },
      );
    }
    data.title = body.title.trim().slice(0, 200);
  }
  if (body.content !== undefined) {
    const content = normalizeSpreadsheetContent(body.content);
    if (!content) {
      return NextResponse.json(
        { error: "Spreadsheet content is invalid or exceeds its limits." },
        { status: 400 },
      );
    }
    data.content = content as Prisma.InputJsonValue;
  }
  if (data.title === undefined && data.content === undefined) {
    return NextResponse.json(
      { error: "Provide a title or spreadsheet content to save." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await prisma.$transaction(async (transaction) => {
    const current = await transaction.spreadsheet.findFirst({
      where: { id, ownerId: session.user.id },
      select: { revision: true },
    });
    if (!current) return { kind: "missing" as const };
    if (current.revision !== baseRevision) {
      return {
        kind: "conflict" as const,
        currentRevision: current.revision,
      };
    }
    const spreadsheet = await transaction.spreadsheet.update({
      where: { id },
      data: { ...data, revision: { increment: 1 } },
      select: { title: true, content: true, revision: true },
    });
    return { kind: "updated" as const, spreadsheet };
  });

  if (result.kind === "missing") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (result.kind === "conflict") {
    return NextResponse.json(
      {
        error: "This spreadsheet changed in another tab.",
        spreadsheetConflict: true,
        currentRevision: result.currentRevision,
      },
      { status: 409 },
    );
  }
  return NextResponse.json({ spreadsheet: result.spreadsheet });
}
