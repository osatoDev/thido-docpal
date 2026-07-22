"use client";

import { useActionState } from "react";

import {
  requestPasswordReset,
  type AuthFlowState,
} from "@/app/auth-flow-actions";

const initialState: AuthFlowState = {};

export function PasswordResetRequestForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="reset-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="reset-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
        />
      </div>
      {state.message && (
        <p
          role="status"
          aria-live="polite"
          className={`text-sm ${state.status === "error" ? "text-[var(--danger)]" : "text-[var(--accent-strong)]"}`}
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="primary-button mt-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}
