import { InitialPromptForm } from "@/components/wizard/InitialPromptForm";
import { Brand } from "@/components/Brand";
import { auth } from "@/lib/auth";

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ resume?: string | string[] }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  const resume = Array.isArray(params.resume) ? params.resume[0] : params.resume;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-12 px-5 py-6 sm:px-8 sm:py-10">
      <Brand />
      <div>
        <p className="page-kicker mb-3">New document</p>
        <h1 className="page-title max-w-2xl">Start with what you know.</h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-[var(--muted)]">
          Answer a few questions and Thido will prepare a focused first draft.
        </p>
      </div>
      <InitialPromptForm
        isAuthenticated={Boolean(session?.user?.id)}
        resumeGuestDraft={resume === "1"}
      />
    </main>
  );
}
