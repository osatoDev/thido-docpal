import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { documentAccessWhere } from "@/lib/documentAuth";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const documents = await prisma.document.findMany({
    where: {
      AND: [
        documentAccessWhere(session.user.id),
        { isPlaceholder: false },
      ],
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: { id: true, title: true, status: true, updatedAt: true },
  });

  return NextResponse.json({ documents });
}
