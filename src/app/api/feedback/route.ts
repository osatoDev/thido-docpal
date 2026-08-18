import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";

const messageDateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
});

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    await reportServerError(new Error("Unauthorized feedback request"), {
      source: "feedback",
      operation: "unauthorized",
      status: 401,
    });
    return Response.json(
      { error: "Sign in again to open your conversation." },
      { status: 401 },
    );
  }

  const thread = await prisma.feedbackThread.findUnique({
    where: { userId: session.user.id },
    select: {
      category: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          authorType: true,
          body: true,
          createdAt: true,
        },
      },
    },
  });

  return Response.json({
    initialCategory: thread?.category ?? "OTHER",
    messages: (thread?.messages ?? []).map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      createdAtLabel: messageDateFormatter.format(message.createdAt),
    })),
  });
}
