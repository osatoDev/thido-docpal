"use client";

import type { CommentAiProgress } from "@/lib/types";

export function CommentResponseProgress({
  progress,
}: {
  progress: CommentAiProgress;
}) {
  const failed = progress.status === "FAILED";
  const processing = progress.status === "PENDING";
  const succeeded = progress.status === "SUCCEEDED";
  const summary = failed
    ? "Thido could not finish responding"
    : succeeded
      ? "Thido finished responding"
    : processing
      ? "Saved — Thido is responding in the background"
      : "Saved — waiting for Thido to start";

  return (
    <details className="group rounded-sm border border-[var(--border)] bg-[var(--surface)] text-xs">
      <summary
        className={`flex list-none items-center gap-2 px-3 py-2.5 marker:hidden ${
          failed ? "text-[var(--danger)]" : "text-[var(--muted)]"
        }`}
      >
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
            failed
              ? "bg-[var(--danger)]"
              : "animate-pulse bg-[var(--accent-strong)]"
          }`}
        />
        <span className="flex-1">{summary}</span>
        <span
          aria-hidden="true"
          className="text-[0.65rem] text-[var(--muted-soft)]"
        >
          View progress
        </span>
      </summary>

      <div className="border-t border-[var(--border)] px-3 py-3">
        <ol className="space-y-2" aria-label="AI response progress">
          <ProgressStep label="Comment saved" state="complete" />
          <ProgressStep
            label={
              failed
                ? "AI response stopped"
                : succeeded
                  ? "AI response prepared"
                : processing
                  ? "Reading context and preparing a response"
                  : "Waiting to start the AI response"
            }
            state={
              failed
                ? "failed"
                : succeeded
                  ? "complete"
                  : processing
                    ? "active"
                    : "waiting"
            }
          />
          <ProgressStep
            label="Reply or suggestion added to this thread"
            state={succeeded ? "active" : "waiting"}
          />
        </ol>
        <p className="mt-3 leading-5 text-[var(--muted-soft)]">
          {failed
            ? "The comment is still saved. You can delete it and try again."
            : "This status refreshes automatically. You can keep editing while Thido works."}
        </p>
      </div>
    </details>
  );
}

function ProgressStep({
  label,
  state,
}: {
  label: string;
  state: "active" | "complete" | "failed" | "waiting";
}) {
  const indicator =
    state === "complete"
      ? "✓"
      : state === "failed"
        ? "!"
        : state === "active"
          ? "•"
          : "○";

  return (
    <li
      className={`flex items-start gap-2 ${
        state === "waiting"
          ? "text-[var(--muted-soft)]"
          : state === "failed"
            ? "text-[var(--danger)]"
            : "text-[var(--foreground)]"
      }`}
    >
      <span
        aria-hidden="true"
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center font-mono"
      >
        {indicator}
      </span>
      <span>{label}</span>
    </li>
  );
}
