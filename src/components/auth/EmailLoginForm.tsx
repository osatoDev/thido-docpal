"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  loginWithPassword,
  type AuthActionState,
} from "@/app/auth-actions";

const initialState: AuthActionState = {};

export function EmailLoginForm({ callbackUrl }: { callbackUrl: string }) {
  const [state, formAction, pending] = useActionState(
    loginWithPassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="login-password" className="text-sm font-medium">
            Password
          </label>
          <Link href="/forgot-password" className="text-link text-xs">
            Forgot password?
          </Link>
        </div>
        <input
          id="login-password"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          maxLength={128}
          className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
        />
      </div>
      {state.message && (
        <p
          role="alert"
          aria-live="polite"
          className="text-sm text-[var(--danger)]"
        >
          {state.message}
        </p>
      )}
      <button
        type="submit"
        disabled={pending}
        className="primary-button mt-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <Link
        href="/verify-email"
        className="text-link text-center text-xs"
      >
        Resend verification email
      </Link>
    </form>
  );
}
