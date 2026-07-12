import { notFound, redirect } from "next/navigation";
import type { JSONContent } from "@tiptap/react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TiptapEditor } from "@/components/editor/TiptapEditor";

type Props = { params: Promise<{ id: string }> };

export default async function EditDocumentPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const document = await prisma.document.findFirst({
    where: { id, ownerId: session.user.id },
    include: {
      comments: {
        where: { parentId: null },
        orderBy: { createdAt: "asc" },
        include: {
          replies: { orderBy: { createdAt: "asc" } },
          suggestion: true,
        },
      },
    },
  });

  if (!document) {
    notFound();
  }

  if (document.status !== "READY") {
    redirect(`/documents/${id}/wizard`);
  }

  const content =
    document.content && typeof document.content === "object"
      ? (document.content as JSONContent)
      : null;

  return (
    <TiptapEditor
      documentId={document.id}
      initialTitle={document.title}
      initialContent={content}
      initialComments={document.comments}
    />
  );
}
