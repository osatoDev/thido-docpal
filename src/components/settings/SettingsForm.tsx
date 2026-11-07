"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AI_MODELS, type AiModelId } from "@/lib/ai/models";
import { AUTOSAVE_DELAY_OPTIONS } from "@/lib/autosave";
import { PLAN_FEEDBACK_DAILY_LIMIT_OPTIONS } from "@/lib/planFeedbackPolicy";

type Props = {
  initialAutosaveDelaySeconds: number;
  initialAiModel: AiModelId;
  initialDocumentStartMode: "NEW_DOCUMENT" | "MOST_RECENT";
  initialChecklistMoveControls: boolean;
  initialPlanFeedbackDailyLimit: number;
};

export function SettingsForm({
  initialAutosaveDelaySeconds,
  initialAiModel,
  initialDocumentStartMode,
  initialChecklistMoveControls,
  initialPlanFeedbackDailyLimit,
}: Props) {
  const router = useRouter();
  const [autosaveDelaySeconds, setAutosaveDelaySeconds] = useState(initialAutosaveDelaySeconds);
  const [aiModel, setAiModel] = useState(initialAiModel);
  const [documentStartMode, setDocumentStartMode] = useState(
    initialDocumentStartMode,
  );
  const [checklistMoveControls, setChecklistMoveControls] = useState(
    initialChecklistMoveControls,
  );
  const [planFeedbackDailyLimit, setPlanFeedbackDailyLimit] = useState(
    initialPlanFeedbackDailyLimit,
  );
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  async function save(update: Record<string, string | boolean | number>) {
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      setSaveState(response.ok ? "saved" : "error");
      if (response.ok) router.refresh();
    } catch {
      setSaveState("error");
    }
  }

  return (
    <div className="flex flex-col border-t border-[var(--border-strong)]">
      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">Document autosave delay</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Save after this much time without editing. Each edit restarts the
              countdown. You can always choose Save now in the editor.
              Reopen an already open document to use the new delay.
            </p>
          </div>
          <select
            aria-label="Document autosave delay"
            value={autosaveDelaySeconds}
            disabled={saveState === "saving"}
            onChange={(event) => {
              const next = Number(event.target.value);
              setAutosaveDelaySeconds(next);
              void save({ autosaveDelaySeconds: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            {AUTOSAVE_DELAY_OPTIONS.map(seconds => (
              <option key={seconds} value={seconds}>
                {seconds < 60 ? `${seconds} seconds` : `${seconds / 60} minute${seconds === 60 ? "" : "s"}`}
                {seconds === 120 ? " (default)" : ""}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">When I open Thido</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              A blank document is the default. Choose the other option if you
              prefer to return to the document you used most recently.
            </p>
          </div>
          <select
            aria-label="When I open Thido"
            value={documentStartMode}
            onChange={(event) => {
              const next = event.target.value as
                | "NEW_DOCUMENT"
                | "MOST_RECENT";
              setDocumentStartMode(next);
              void save({ documentStartMode: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            <option value="NEW_DOCUMENT">Open a blank document (default)</option>
            <option value="MOST_RECENT">Open my most recent document</option>
          </select>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">AI model</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Used for adding tasks in plain language and for feedback on your
              plans.
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
                {model.label}: {model.description}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">Checklist reorder arrows</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              Show small up/down arrows beside checklist items so you can
              reorder them without dragging.
            </p>
          </div>
          <select
            aria-label="Checklist reorder arrows"
            value={checklistMoveControls ? "true" : "false"}
            onChange={(event) => {
              const next = event.target.value === "true";
              setChecklistMoveControls(next);
              void save({ checklistMoveControls: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            <option value="true">Show reorder arrows (default)</option>
            <option value="false">Hide reorder arrows</option>
          </select>
        </div>
      </section>

      <section className="border-b border-[var(--border)] py-7">
        <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-center sm:gap-10">
          <div>
            <h2 className="font-semibold">Automatic plan feedback</h2>
            <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
              After you add a task with the planner bar, Thido sometimes
              reviews that day&apos;s plan. This caps how often it happens each
              day. Review my day always works on request.
            </p>
          </div>
          <select
            aria-label="Automatic plan feedback"
            value={planFeedbackDailyLimit}
            onChange={(event) => {
              const next = Number(event.target.value);
              setPlanFeedbackDailyLimit(next);
              void save({ planFeedbackDailyLimit: next });
            }}
            className="app-input rounded-md px-3 py-2.5 text-sm outline-none"
          >
            {PLAN_FEEDBACK_DAILY_LIMIT_OPTIONS.map((limit) => (
              <option key={limit} value={limit}>
                {limit === 0
                  ? "Off"
                  : `Up to ${limit} time${limit === 1 ? "" : "s"} a day${limit === 3 ? " (default)" : ""}`}
              </option>
            ))}
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
