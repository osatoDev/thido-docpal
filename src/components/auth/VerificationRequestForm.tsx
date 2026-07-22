"use client";

import { useActionState } from "react";

import {
  requestVerificationEmail,
  type AuthFlowState,
} from "@/app/auth-flow-actions";

const initialState: AuthFlowState = {};

export function VerificationRequestForm({
  email = "",
  callbackUrl = "/",
}: {
  email?: string;
  callbackUrl?: string;
}) {
  const [state, formAction, pending] = useActionState(
    requestVerificationEmail,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="verification-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="verification-email"
          type="email"
          name="email"
          defaultValue={email}
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
          className="text-sm text-[var(--accent-strong)]"
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="secondary-button rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Sending…" : "Send a new verification link"}
      </button>
    </form>
  );
}
