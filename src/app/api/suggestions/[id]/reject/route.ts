import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggestionForUser } from "@/lib/documentAuth";
import { unauthorizedResponse } from "@/lib/apiResponses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const suggestion = await getSuggestionForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
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
