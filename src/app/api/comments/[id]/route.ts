import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedComment } from "@/lib/documentAuth";
import { unauthorizedResponse } from "@/lib/apiResponses";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getOwnedComment(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.status !== "OPEN" && body.status !== "RESOLVED") {
    return NextResponse.json(
      { error: "status must be OPEN or RESOLVED" },
      { status: 400 },
    );
  }

  const comment = await prisma.comment.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json({ comment });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  const { id } = await params;
  const existing = await getOwnedComment(id, session.user.id);
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.comment.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
