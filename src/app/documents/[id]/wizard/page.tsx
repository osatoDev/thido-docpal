import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOwnedDocument } from "@/lib/documentAuth";
import { generateFollowupQuestions } from "@/lib/ai/generateFollowups";
import { FollowupPromptForm } from "@/components/wizard/FollowupPromptForm";

type Props = { params: Promise<{ id: string }> };

export default async function WizardPage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { id } = await params;
  const document = await getOwnedDocument(id, session.user.id);
  if (!document) {
    notFound();
  }

  if (document.status === "READY") {
    redirect(`/documents/${id}/edit`);
  }

  const initialAnswers = await prisma.promptAnswer.findMany({
    where: { documentId: id, stage: "INITIAL" },
  });
  if (initialAnswers.length === 0) {
    redirect("/documents/new");
  }

  let followups;
  try {
    followups = await generateFollowupQuestions(id);
  } catch (error) {
    console.error("Failed to generate follow-up questions", error);
    return (
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
        <p className="text-sm font-medium">
          We couldn&apos;t generate follow-up questions right now.
        </p>
        <p className="text-sm text-gray-500">
          This usually means the AI service is temporarily unavailable.
          Please try again in a moment.
        </p>
        <a
          href={`/documents/${id}/wizard`}
          className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Try again
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold">A few more details</h1>
        <p className="text-sm text-gray-500">
          Answer these and Thido will write the first draft.
        </p>
      </div>
      <FollowupPromptForm
        documentId={id}
        followups={followups.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
        }))}
      />
    </main>
  );
}
