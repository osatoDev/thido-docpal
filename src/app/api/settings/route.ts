import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (body.aiCommentMode !== "PROPOSE" && body.aiCommentMode !== "AUTO_APPLY") {
    return NextResponse.json(
      { error: "aiCommentMode must be PROPOSE or AUTO_APPLY" },
      { status: 400 },
    );
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: { aiCommentMode: body.aiCommentMode },
    create: { userId: session.user.id, aiCommentMode: body.aiCommentMode },
  });

  return NextResponse.json({ settings });
}
