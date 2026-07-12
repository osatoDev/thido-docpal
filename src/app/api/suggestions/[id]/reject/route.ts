import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedSuggestion } from "@/lib/documentAuth";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const suggestion = await getOwnedSuggestion(id, session.user.id);
  if (!suggestion) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.status !== "PENDING") {
    return NextResponse.json(
      { error: "Suggestion is not pending" },
      { status: 409 },
    );
  }

  const updated = await prisma.suggestion.update({
    where: { id },
    data: { status: "REJECTED", resolvedAt: new Date() },
  });

  return NextResponse.json({ suggestion: updated });
}
