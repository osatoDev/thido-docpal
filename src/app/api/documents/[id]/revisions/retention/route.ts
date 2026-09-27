import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { keepAllDocumentHistory } from "@/lib/documentHistoryRetention";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return Response.json({ error: "Sign in to keep your history." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (body?.keepAll !== true) return Response.json({ error: "Choose Keep all versions." }, { status: 400 });
  const { id } = await params;
  if (!await keepAllDocumentHistory(prisma, id, session.user.id)) {
    return Response.json({ error: "Only the document owner can change this preference." }, { status: 404 });
  }
  return Response.json({ keepAll: true, deleteAfter: null });
}
