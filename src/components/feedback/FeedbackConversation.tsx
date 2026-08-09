"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { sendUserFeedbackMessage } from "@/app/feedback-actions";
import { initialFeedbackActionState } from "@/lib/feedback-action-state";

export type FeedbackMessageView = {
  id: string;
  authorType: "USER" | "FOUNDER";
  body: string;
  createdAt: string;
  createdAtLabel: string;
};

const CATEGORY_LABELS = {
  PROBLEM: "Problem",
  IDEA: "Idea",
  QUESTION: "Question",
  OTHER: "Other",
} as const;

export function FeedbackConversation({
  messages,
  initialCategory,
  contextPath,
}: {
  messages: FeedbackMessageView[];
  initialCategory: keyof typeof CATEGORY_LABELS;
  contextPath: string | null;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const [state, formAction, pending] = useActionState(
    sendUserFeedbackMessage,
    initialFeedbackActionState,
  );

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages.length]);

  useEffect(() => {
    if (!state.submissionId) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state.submissionId]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [router]);

  return (
    <div className="grid min-h-0 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section
        className="app-panel flex min-h-[26rem] flex-col overflow-hidden rounded-2xl"
        aria-labelledby="conversation-heading"
      >
        <div className="border-b border-[var(--border)] px-5 py-4 sm:px-6">
          <h2 id="conversation-heading" className="font-semibold">
            Your conversation
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Only you and the Thido founding team can see these messages.
          </p>
        </div>
        <div className="flex max-h-[34rem] flex-1 flex-col gap-4 overflow-y-auto p-5 sm:p-6">
          {messages.length === 0 ? (
            <div className="my-auto max-w-md">
              <p className="font-serif text-2xl">Start a conversation.</p>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                Share a problem, an idea, or a question. A founder will read it
                and reply here.
              </p>
            </div>
          ) : (
            messages.map((message) => {
              const fromFounder = message.authorType === "FOUNDER";
              return (
                <article
                  key={message.id}
                  className={`max-w-[85%] rounded-xl px-4 py-3 ${
                    fromFounder
                      ? "self-start bg-[var(--surface-subtle)]"
                      : "self-end bg-[color-mix(in_srgb,var(--accent)_28%,var(--surface))]"
                  }`}
                >
                  <p className="text-xs font-semibold text-[var(--muted)]">
                    {fromFounder ? "Thido founding team" : "You"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-6">
                    {message.body}
                  </p>
                  <time
                    dateTime={message.createdAt}
                    className="mt-2 block text-[0.65rem] text-[var(--muted-soft)]"
                  >
                    {message.createdAtLabel}
                  </time>
                </article>
              );
            })
          )}
          <div ref={endRef} />
        </div>
      </section>

      <form
        ref={formRef}
        action={formAction}
        className="app-panel flex h-fit flex-col gap-4 rounded-2xl p-5 sm:p-6"
      >
        <div>
          <h2 className="font-semibold">Want a feature? Suggest it here</h2>
          <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
            We try to reply immediately. If we are away, expect a response
            within eight hours.
          </p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          What is this about?
          <select
            name="category"
            defaultValue={initialCategory}
            className="app-input rounded-lg px-3 py-2.5 text-sm"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Message
          <textarea
            name="body"
            required
            maxLength={4_000}
            rows={7}
            placeholder="Tell us what happened or what would make Thido better…"
            className="app-input resize-y rounded-lg px-3 py-2.5 text-sm leading-6"
          />
        </label>
        {contextPath && (
          <label className="flex items-start gap-2 text-xs leading-5 text-[var(--muted)]">
            <input
              type="checkbox"
              name="currentPath"
              value={contextPath}
              defaultChecked
              className="mt-1"
            />
            Include page context: {contextPath}
          </label>
        )}
        {state.message && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`text-sm ${
              state.status === "error"
                ? "text-[var(--danger)]"
                : "text-[var(--accent-strong)]"
            }`}
          >
            {state.message}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="primary-button rounded-lg px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
        >
          {pending ? "Sending…" : "Send message"}
        </button>
      </form>
    </div>
  );
}
