import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { ownerId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "Untitled Document";

  const document = await prisma.document.create({
    data: { title, ownerId: session.user.id },
    select: { id: true },
  });

  return NextResponse.json({ documentId: document.id }, { status: 201 });
}
