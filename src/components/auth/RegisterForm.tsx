"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  registerWithPassword,
  type AuthActionState,
} from "@/app/auth-actions";

const initialState: AuthActionState = {};

function FieldErrors({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;
  return <p className="text-xs text-[var(--danger)]">{errors[0]}</p>;
}

export function RegisterForm({
  callbackUrl,
  remainingSeats,
}: {
  callbackUrl: string;
  remainingSeats: number;
}) {
  const [state, formAction, pending] = useActionState(
    registerWithPassword,
    initialState,
  );

  return (
    <form action={formAction} className="flex w-full flex-col gap-3">
      <input type="hidden" name="callbackUrl" value={callbackUrl} />
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-name" className="text-sm font-medium">
          Name
        </label>
        <input
          id="register-name"
          name="name"
          autoComplete="name"
          required
          minLength={2}
          maxLength={80}
          className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
        />
        <FieldErrors errors={state.errors?.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-email" className="text-sm font-medium">
          Email
        </label>
        <input
          id="register-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          maxLength={254}
          className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
        />
        <FieldErrors errors={state.errors?.email} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="register-password" className="text-sm font-medium">
          Password
        </label>
        <input
          id="register-password"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          minLength={12}
          maxLength={128}
          aria-describedby="password-requirements"
          className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
        />
        <p id="password-requirements" className="text-xs text-[var(--muted)]">
          Use at least 12 characters.
        </p>
        <FieldErrors errors={state.errors?.password} />
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
      {remainingSeats === 0 && !state.message && (
        <p role="status" className="text-sm text-[var(--muted)]">
          The free beta is full. Existing members can still sign in.
        </p>
      )}
      <button
        type="submit"
        disabled={pending || remainingSeats === 0}
        className="primary-button mt-1 rounded-xl px-4 py-3 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
      >
        {pending
          ? "Creating account…"
          : remainingSeats === 0
            ? "Beta full"
            : "Claim free beta place"}
      </button>
      <p className="text-center text-xs leading-5 text-[var(--muted)]">
        By creating an account, you agree to the{" "}
        <Link className="text-link underline" href="/terms">
          Terms of Service
        </Link>{" "}
        and acknowledge the{" "}
        <Link className="text-link underline" href="/privacy">
          Privacy Policy
        </Link>
        .
      </p>
    </form>
  );
}
