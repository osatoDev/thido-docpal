"use client";

import { useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { formatDay, todayDay } from "@/lib/documentDays";
import { dayPlanText, insertScheduledTask, scheduledTaskText } from "@/lib/scheduleInsert";

type Feedback = { id: string; day: string; trigger: "AUTO" | "MANUAL"; feedback: string };
type AnswerOption = { title: string; details: string; time: string | null; task: string; sourceUrl: string | null };
type Answer = { request: string; day: string; summary: string; options: AnswerOption[] };
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
 * Natural-language task entry, with automatic AI feedback on the day a task
 * lands on. Tasks are
 * written into the document in the browser, so they autosave and undo like
 * any other edit. Requests ("list 10 cinemas near the venue") are answered
 * with web search; nothing is added until the user picks an option.
 */
export function PlannerBar({ editor, documentId }: { editor: Editor; documentId: string }) {
  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [addedOptions, setAddedOptions] = useState<ReadonlySet<number>>(new Set());
  const input = useRef<HTMLInputElement>(null);

  async function requestFeedback(day: string, newEntry: string) {
    const plan = dayPlanText(editor.state.doc, day) ?? "";
    const response = await fetch(`/api/documents/${documentId}/plan-feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day, today: localContext().today, plan, trigger: "AUTO", newEntry }),
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
      if (parsed.kind === "request") {
        await answerRequest(entry, parsed.date);
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
      void requestFeedback(added[0], taskText).catch(() => undefined);
    } catch {
      setStatus({ kind: "error", text: "Thido couldn't reach the server. Try again." });
    } finally {
      setAdding(false);
    }
  }

  async function answerRequest(request: string, day: string) {
    setStatus({ kind: "info", text: "Looking this up. This can take up to a minute…" });
    const response = await fetch(`/api/documents/${documentId}/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: request, day, plan: dayPlanText(editor.state.doc, day) ?? "", ...localContext() }),
    });
    if (!response.ok) {
      setStatus({ kind: "error", text: await readError(response, "Thido couldn't look that up.") });
      return;
    }
    const { answer: found } = await response.json();
    setAnswer({ request, ...found });
    setAddedOptions(new Set());
    setText("");
    setStatus(null);
  }

  function addOption(index: number) {
    if (!answer || !editor.isEditable) return;
    const option = answer.options[index];
    const tr = insertScheduledTask(editor.state, { date: answer.day, time: option.time, task: option.task });
    if (!tr) {
      setStatus({ kind: "error", text: "Thido couldn't add that task here." });
      return;
    }
    editor.view.dispatch(tr);
    setAddedOptions((current) => new Set(current).add(index));
    setStatus({ kind: "info", text: `Added “${scheduledTaskText(option)}” to ${formatDay(answer.day)}.` });
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
          {adding ? "Working…" : "Add"}
        </button>
      </form>
      <p
        role={status?.kind === "error" ? "alert" : "status"}
        className={`min-h-5 pt-1 text-xs ${status?.kind === "error" ? "text-[var(--danger)]" : "text-[var(--muted)]"}`}
      >
        {status?.text}
      </p>
      {answer ? (
        <section aria-label="Thido's answer" className="mt-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3 text-sm leading-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[var(--accent-strong)]">For {formatDay(answer.day)}: {answer.request}</p>
              <p className="mt-1">{answer.summary}</p>
            </div>
            <button type="button" aria-label="Dismiss answer" onClick={() => setAnswer(null)} className="inline-flex size-8 items-center justify-center rounded-md text-[var(--muted)] hover:bg-[var(--surface-subtle)]">
              ×
            </button>
          </div>
          {answer.options.length > 0 ? (
            <ol className="mt-3 max-h-96 divide-y divide-[var(--border)] overflow-y-auto">
              {answer.options.map((option, index) => (
                <li key={`${option.title}-${index}`} className="flex flex-wrap items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0 flex-1 basis-64">
                    <p className="font-medium">
                      {option.time ? <span className="mr-1.5 font-mono text-xs text-[var(--accent-strong)]">{option.time}</span> : null}
                      {option.title}
                    </p>
                    <p className="text-[var(--muted)]">{option.details}</p>
                    {option.sourceUrl ? (
                      <a href={option.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-link text-xs">
                        Source: {new URL(option.sourceUrl).hostname}
                      </a>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => addOption(index)}
                    disabled={addedOptions.has(index)}
                    className="secondary-button h-9 shrink-0 rounded-lg px-3 text-xs font-medium disabled:opacity-60"
                  >
                    {addedOptions.has(index) ? "Added" : "Add to plan"}
                  </button>
                </li>
              ))}
            </ol>
          ) : null}
        </section>
      ) : null}
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
