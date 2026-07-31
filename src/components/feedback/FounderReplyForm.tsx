"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import {
  initialFeedbackActionState,
  sendFounderFeedbackReply,
} from "@/app/feedback-actions";

export function FounderReplyForm({ threadId }: { threadId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    sendFounderFeedbackReply,
    initialFeedbackActionState,
  );

  useEffect(() => {
    if (!state.submissionId) return;
    formRef.current?.reset();
    router.refresh();
  }, [router, state.submissionId]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="threadId" value={threadId} />
      <label htmlFor="founder-reply" className="text-sm font-semibold">
        Reply as the founding team
      </label>
      <textarea
        id="founder-reply"
        name="body"
        required
        maxLength={4_000}
        rows={6}
        className="app-input resize-y rounded-lg px-3 py-2.5 text-sm leading-6"
        placeholder="Write a reply…"
      />
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
        {pending ? "Sending reply…" : "Send reply"}
      </button>
    </form>
  );
}
