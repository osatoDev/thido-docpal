import type { Metadata } from "next";
import type { JSONContent } from "@tiptap/react";
import { redirect } from "next/navigation";

import { getEditorSettings } from "@/app/documents/[id]/edit/EditDocumentPageContent";
import { TiptapEditor } from "@/components/editor/TiptapEditor";
import { PlanTimeZoneSync } from "@/components/editor/PlanTimeZoneSync";
import { auth } from "@/lib/auth";
import { recordDocumentAccess } from "@/lib/documentAccess";
import { getOrCreatePlan, PLAN_TITLE } from "@/lib/plan";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: `${PLAN_TITLE} | Thido` };

export default async function PlanPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/plan");
  }

  const plan = await getOrCreatePlan(session.user.id);
  const [document, settings] = await Promise.all([
    prisma.document.findUniqueOrThrow({ where: { id: plan.id } }),
    getEditorSettings(session.user.id),
  ]);
  recordDocumentAccess(document.id);

  return (
    <>
    <PlanTimeZoneSync savedTimeZone={settings?.timeZone ?? null} />
    <TiptapEditor
      isPlan
      documentId={document.id}
      initialTitle={PLAN_TITLE}
      initialTitleManuallySet
      initialCreatedAt={document.createdAt.toISOString()}
      initialContent={
        document.content && typeof document.content === "object"
          ? (document.content as JSONContent)
          : null
      }
      initialRevision={document.revision}
      currentUser={session.user}
      checklistMoveControls={settings?.checklistMoveControls ?? true}
    />
    </>
  );
}
