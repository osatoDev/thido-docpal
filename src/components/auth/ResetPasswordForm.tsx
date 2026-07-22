"use client";

import { useActionState } from "react";

import {
  resetPassword,
  type AuthFlowState,
} from "@/app/auth-flow-actions";

const initialState: AuthFlowState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="new-password" className="text-sm font-medium">
          New password
        </label>
        <input
          id="new-password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          aria-describedby="new-password-requirements"
          className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
        />
        <p
          id="new-password-requirements"
          className="text-xs text-[var(--muted)]"
        >
          Use at least 12 characters.
        </p>
        {state.errors?.password?.[0] && (
          <p className="text-xs text-[var(--danger)]">
            {state.errors.password[0]}
          </p>
        )}
      </div>
      {state.message && (
        <p role="alert" aria-live="polite" className="text-sm text-[var(--danger)]">
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="primary-button mt-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Updating…" : "Set new password"}
      </button>
    </form>
  );
}
