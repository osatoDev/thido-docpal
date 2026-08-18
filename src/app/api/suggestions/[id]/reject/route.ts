import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSuggestionForUser } from "@/lib/documentAuth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const { id } = await params;
  const suggestion = await getSuggestionForUser(
    id,
    session.user.id,
    session.user.email,
    "EDIT",
  );
  if (!suggestion) {
    await reportServerError(new Error("Suggestion not found"), {
      source: "suggestion",
      operation: "not-found",
      status: 404,
      entryId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (suggestion.status !== "PENDING") {
    await reportServerError(new Error("Suggestion is not pending"), {
      source: "suggestion",
      operation: "not-pending",
      status: 409,
      entryId: id,
    });
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
