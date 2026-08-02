"use client";

import { useActionState } from "react";

import {
  addPasswordCredential,
  connectGoogleAccount,
  type ConnectedAccountActionState,
} from "@/app/account-actions";

const initialState: ConnectedAccountActionState = {};

function StatusBadge({ connected }: { connected: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 font-mono text-[0.65rem] font-semibold ${
        connected
          ? "bg-[var(--surface-subtle)] text-[var(--accent-strong)]"
          : "border border-[var(--border)] text-[var(--muted)]"
      }`}
    >
      {connected ? "Connected" : "Not connected"}
    </span>
  );
}

export function ConnectedAccounts({
  email,
  hasGoogle,
  hasPassword,
  notice,
}: {
  email: string;
  hasGoogle: boolean;
  hasPassword: boolean;
  notice?: string;
}) {
  const [state, passwordAction, pending] = useActionState(
    addPasswordCredential,
    initialState,
  );
  const passwordConnected = hasPassword || state.success === true;

  return (
    <section className="app-panel overflow-hidden rounded-2xl" aria-labelledby="connected-accounts-heading">
      <div className="border-b border-[var(--border)] p-5 sm:p-7">
        <p className="page-kicker">Sign-in methods</p>
        <h2 id="connected-accounts-heading" className="mt-1 text-xl font-semibold tracking-[-0.03em]">
          Connected accounts
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Deliberately connect Google and password sign-in to the same Thido
          account for {email}.
        </p>
        {notice === "google-linked" && (
          <p role="status" className="mt-3 text-sm text-[var(--accent-strong)]">
            Google sign-in is connected.
          </p>
        )}
      </div>

      <div className="divide-y divide-[var(--border)]">
        <div className="flex flex-wrap items-center justify-between gap-4 p-5 sm:px-7">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="font-medium">Google</h3>
              <StatusBadge connected={hasGoogle} />
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Sign in through the Google account that uses {email}.
            </p>
          </div>
          {hasGoogle ? (
            <span className="text-sm text-[var(--muted)]">Ready to use</span>
          ) : (
            <form action={connectGoogleAccount}>
              <button type="submit" className="secondary-button rounded-xl px-4 py-2.5 text-sm font-semibold">
                Connect Google
              </button>
            </form>
          )}
        </div>

        <div className="p-5 sm:px-7">
          <div className="flex items-center gap-3">
            <h3 className="font-medium">Email and password</h3>
            <StatusBadge connected={passwordConnected} />
          </div>
          {passwordConnected ? (
            <p className="mt-2 text-sm text-[var(--muted)]">
              Password sign-in is ready for {email}. You can reset it from the sign-in page.
            </p>
          ) : (
            <form action={passwordAction} className="mt-4 grid max-w-xl gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                New password
                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium">
                Confirm password
                <input
                  type="password"
                  name="passwordConfirmation"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={128}
                  className="app-input rounded-xl px-3 py-2.5 text-sm outline-none"
                />
              </label>
              <p className="text-xs text-[var(--muted)] sm:col-span-2">
                Use at least 12 characters.
              </p>
              {state.message && (
                <p
                  role={state.success ? "status" : "alert"}
                  className={`text-sm sm:col-span-2 ${state.success ? "text-[var(--accent-strong)]" : "text-[var(--danger)]"}`}
                >
                  {state.message}
                </p>
              )}
              <button
                type="submit"
                disabled={pending}
                className="primary-button w-fit rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
              >
                {pending ? "Connecting…" : "Connect password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
