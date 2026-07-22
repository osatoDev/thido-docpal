"use client";

import { useState } from "react";
import { AI_MODELS, type AiModelId } from "@/lib/ai/models";

type CommentMode = "PROPOSE" | "AUTO_APPLY";
type DocumentStartMode = "NEW_DOCUMENT" | "MOST_RECENT";

type Props = {
  initialAiModel: AiModelId;
  initialCommentMode: CommentMode;
  initialDocumentStartMode: DocumentStartMode;
};

export function SettingsForm({
  initialAiModel,
  initialCommentMode,
  initialDocumentStartMode,
}: Props) {
  const [aiModel, setAiModel] = useState(initialAiModel);
  const [commentMode, setCommentMode] = useState(initialCommentMode);
  const [documentStartMode, setDocumentStartMode] = useState(
    initialDocumentStartMode,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(update: Record<string, string>) {
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      setSaveState(response.ok ? "saved" : "error");
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col border-t border-[var(--border-strong)]">
      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">When Thido opens</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Choose whether the home page starts fresh or returns to your
              latest editable document.
            </p>
          </div>
          <select
            value={documentStartMode}
            onChange={(event) => {
              const next = event.target.value as DocumentStartMode;
              setDocumentStartMode(next);
              void save({ documentStartMode: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            <option value="NEW_DOCUMENT">Create a new blank document</option>
            <option value="MOST_RECENT">Open my most recent document</option>
          </select>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">Default AI model</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Used for drafting, follow-up questions, and comment responses.
            </p>
          </div>
          <select
            value={aiModel}
            onChange={(event) => {
              const next = event.target.value as AiModelId;
              setAiModel(next);
              void save({ aiModel: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            {AI_MODELS.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label} — {model.description}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">AI edit suggestions</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Keep final control, or allow suggested changes to be applied
              immediately.
            </p>
          </div>
          <select
            value={commentMode}
            onChange={(event) => {
              const next = event.target.value as CommentMode;
              setCommentMode(next);
              void save({ aiCommentMode: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            <option value="PROPOSE">Ask for my approval</option>
            <option value="AUTO_APPLY">Apply automatically</option>
          </select>
        </div>
      </section>

      <p className="min-h-5 pt-3 text-xs text-[var(--muted)]" role="status">
        {saveState === "saving" && "Saving…"}
        {saveState === "saved" && "Settings saved"}
        {saveState === "error" && "Could not save settings"}
      </p>
    </div>
  );
}
