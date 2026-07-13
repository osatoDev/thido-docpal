import { InitialPromptForm } from "@/components/wizard/InitialPromptForm";
import { Brand } from "@/components/Brand";

export default function NewDocumentPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 p-5 sm:p-8">
      <Brand />
      <div>
        <p className="mb-1 font-mono text-[0.65rem] font-semibold tracking-[0.16em] text-[var(--accent-strong)] uppercase">New document</p>
        <h1 className="text-3xl font-semibold tracking-[-0.04em]">Let&apos;s find the shape of it.</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Answer a few questions and Thido will draft a first version for you.
        </p>
      </div>
      <InitialPromptForm />
    </main>
  );
}
