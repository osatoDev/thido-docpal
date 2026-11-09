import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { documentAccessWhere } from "@/lib/documentAuth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

/**
 * The document's current revision only. Open editors poll this to notice a
 * save made in another browser without downloading the whole document.
 */
export async function GET(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) return await unauthorizedResponse();

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: { id, AND: documentAccessWhere(session.user.id) },
    select: { revision: true },
  });
  if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(
    { revision: document.revision },
    { headers: { "Cache-Control": "no-store" } },
  );
}
