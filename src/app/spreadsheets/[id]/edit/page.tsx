import { notFound, redirect } from "next/navigation";

import { SpreadsheetEditor } from "@/components/spreadsheets/SpreadsheetEditor";
import { auth } from "@/lib/auth";
import { recordSpreadsheetAccess } from "@/lib/documentAccess";
import { prisma } from "@/lib/prisma";
import { normalizeSpreadsheetContent } from "@/lib/spreadsheet";

type Props = { params: Promise<{ id: string }> };

export default async function EditSpreadsheetPage({ params }: Props) {
  const session = await auth();
  const { id } = await params;
  if (!session?.user?.id) {
    redirect(
      `/login?notice=sign-in-required&callbackUrl=${encodeURIComponent(`/spreadsheets/${id}/edit`)}`,
    );
  }

  const spreadsheet = await prisma.spreadsheet.findFirst({
    where: { id, ownerId: session.user.id },
    select: { id: true, title: true, content: true, revision: true },
  });
  if (!spreadsheet) notFound();

  const content = normalizeSpreadsheetContent(spreadsheet.content);
  if (!content) notFound();
  recordSpreadsheetAccess(spreadsheet.id);

  return (
    <SpreadsheetEditor
      spreadsheetId={spreadsheet.id}
      initialTitle={spreadsheet.title}
      initialContent={content}
      initialRevision={spreadsheet.revision}
      currentUser={session.user}
    />
  );
}
