"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AI_MODELS, type AiModelId } from "@/lib/ai/models";
import {
  APPLICATION_STYLE_OPTIONS,
  type ApplicationStyle,
} from "@/lib/applicationStyle";

type CommentMode = "PROPOSE" | "AUTO" | "AUTO_APPLY";

type Props = {
  initialAiModel: AiModelId;
  initialCommentMode: CommentMode;
  initialApplicationStyle: ApplicationStyle;
};

export function SettingsForm({
  initialAiModel,
  initialCommentMode,
  initialApplicationStyle,
}: Props) {
  const router = useRouter();
  const [aiModel, setAiModel] = useState(initialAiModel);
  const [commentMode, setCommentMode] = useState(initialCommentMode);
  const [applicationStyle, setApplicationStyle] = useState(
    initialApplicationStyle,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    document.documentElement.dataset.appStyle = initialApplicationStyle;
  }, [initialApplicationStyle]);

  async function save(update: Record<string, string>) {
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      setSaveState(response.ok ? "saved" : "error");
      if (response.ok && update.applicationStyle) router.refresh();
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col border-t border-[var(--border-strong)]">
      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">Application style</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Changes the appearance of Thido across navigation, settings,
              documents, and other application pages.
            </p>
          </div>
          <select
            aria-label="Application style"
            value={applicationStyle}
            onChange={(event) => {
              const next = event.target.value as ApplicationStyle;
              setApplicationStyle(next);
              document.documentElement.dataset.appStyle = next;
              void save({ applicationStyle: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            {APPLICATION_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} — {option.description}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">AI model</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Used for drafting, follow-up questions, and comment responses.
            </p>
          </div>
          <select
            aria-label="AI model"
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
            <h2 className="font-semibold">How Thido applies edits</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Choose whether Thido decides from your prompt, asks for approval,
              or applies changes immediately.
            </p>
          </div>
          <select
            aria-label="How Thido applies edits"
            value={commentMode}
            onChange={(event) => {
              const next = event.target.value as CommentMode;
              setCommentMode(next);
              void save({ aiCommentMode: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            <option value="AUTO">
              Auto — decide from my prompt (recommended)
            </option>
            <option value="PROPOSE">Always ask for my approval</option>
            <option value="AUTO_APPLY">Always apply automatically</option>
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
