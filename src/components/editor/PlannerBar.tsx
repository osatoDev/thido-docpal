"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { formatDay, todayDay } from "@/lib/documentDays";
import { dayAtPosition, dayPlanText, insertScheduledTask, scheduledTaskText } from "@/lib/scheduleInsert";

type Feedback = { id: string; day: string; trigger: "AUTO" | "MANUAL"; feedback: string };
type Status = { kind: "info" | "error"; text: string } | null;

function localContext() {
  return {
    today: todayDay(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  };
}

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

/**
 * Natural-language task entry plus AI feedback on a day's plan. Tasks are
 * written into the document in the browser, so they autosave and undo like
 * any other edit.
 */
export function PlannerBar({ editor, documentId }: { editor: Editor; documentId: string }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const input = useRef<HTMLInputElement>(null);

  async function requestFeedback(day: string, trigger: "AUTO" | "MANUAL", newEntry?: string) {
    const plan = dayPlanText(editor.state.doc, day) ?? "";
    const response = await fetch(`/api/documents/${documentId}/plan-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, today: localContext().today, plan, trigger, newEntry }),
    });
    if (!response.ok) throw new Error(await readError(response, "Thido couldn't review this day."));
    const body = await response.json();
    if (body.feedback) setFeedback(body.feedback);
  }

  async function addTask(event: React.FormEvent) {
    event.preventDefault();
    const entry = text.trim();
    if (!entry || adding) return;
    setAdding(true);
    setStatus(null);
    try {
      const response = await fetch(`/api/documents/${documentId}/schedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: entry, ...localContext() }),
      });
      if (!response.ok) {
        setStatus({ kind: "error", text: await readError(response, "Thido couldn't schedule that.") });
        return;
      }
      const { entry: parsed } = await response.json();
      if (!parsed?.ok) {
        setStatus({ kind: "info", text: parsed?.clarification ?? "Which day should this go on?" });
        input.current?.focus();
        return;
      }
      if (!editor.isEditable) {
        setStatus({ kind: "error", text: "This document can't be edited right now." });
        return;
      }
      const dates: string[] = parsed.dates;
      // A repeating entry ("every day for the next week") goes under each of its days.
      const added = dates.filter((date) => {
        const tr = insertScheduledTask(editor.state, { date, time: parsed.time, task: parsed.task });
        if (tr) editor.view.dispatch(tr);
        return Boolean(tr);
      });
      if (added.length === 0) {
        setStatus({ kind: "error", text: "Thido couldn't add that task here." });
        return;
      }
      const taskText = scheduledTaskText(parsed);
      setText("");
      setStatus({
        kind: "info",
        text: added.length === 1
          ? `Added “${taskText}” to ${formatDay(added[0])}.`
          : `Added “${taskText}” to ${added.length} days, ${formatDay(added[0])} to ${formatDay(added[added.length - 1])}.`,
      });
      // Automatic feedback is decided (and capped) by the server; failures stay silent.
      void requestFeedback(added[0], "AUTO", taskText).catch(() => undefined);
    } catch {
      setStatus({ kind: "error", text: "Thido couldn't reach the server. Try again." });
    } finally {
      setAdding(false);
    }
  }

  async function reviewDay() {
    const day = dayAtPosition(editor.state.doc, editor.state.selection.from) ?? localContext().today;
    setReviewing(true);
    setStatus(null);
    try {
      await requestFeedback(day, "MANUAL");
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "Thido couldn't review this day." });
    } finally {
      setReviewing(false);
    }
  }

  return (
    <div className="print-hidden mx-auto w-full max-w-none" data-testid="planner-bar">
      <form onSubmit={addTask} className="flex flex-wrap items-center gap-2">
        <label htmlFor="planner-entry" className="sr-only">Add a task to a day</label>
        <input
          id="planner-entry"
          ref={input}
          value={text}
          maxLength={500}
          onChange={event => setText(event.target.value)}
          placeholder="Add a task… e.g. “Dentist next Tuesday 3pm”"
          disabled={adding}
          className="app-input h-11 min-w-0 flex-1 rounded-lg px-3.5 text-sm outline-none"
        />
        <button type="submit" disabled={adding || !text.trim()} className="primary-button h-11 rounded-lg px-4 text-sm font-semibold disabled:opacity-50">
          {adding ? "Adding…" : "Add"}
        </button>
        <button type="button" onClick={reviewDay} disabled={reviewing} className="secondary-button h-11 rounded-lg px-4 text-sm font-medium disabled:opacity-50">
          {reviewing ? "Reviewing…" : "Review my day"}
        </button>
      </form>
      <p
        role={status?.kind === "error" ? "alert" : "status"}
        className={`min-h-5 pt-1 text-xs ${status?.kind === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}
      >
        {status?.text}
      </p>
      {feedback ? (
        <aside aria-label="Plan feedback" className="mt-1 flex items-start gap-3 rounded-lg bg-[var(--accent-tint)] px-3.5 py-3 text-sm leading-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--accent-strong)]">
              {feedback.trigger === "AUTO" ? "Thido's take on" : "Review of"} {formatDay(feedback.day)}
            </p>
            <p>{feedback.feedback}</p>
          </div>
          <button type="button" aria-label="Dismiss feedback" onClick={() => setFeedback(null)} className="inline-flex size-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface)]">
            ×
          </button>
        </aside>
      ) : null}
    </div>
  );
}
