import { InitialPromptForm } from "@/components/wizard/InitialPromptForm";

export default function NewDocumentPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-8">
      <div>
        <h1 className="text-xl font-semibold">Let&apos;s start your document</h1>
        <p className="text-sm text-gray-500">
          Answer a few questions and Thido will draft a first version for you.
        </p>
      </div>
      <InitialPromptForm />
    </main>
  );
}
