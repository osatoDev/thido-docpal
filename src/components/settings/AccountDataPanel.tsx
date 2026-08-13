"use client";

import { useActionState, useState } from "react";

import {
  deleteAccount,
  type DeleteAccountState,
} from "@/app/account-data-actions";

const initialState: DeleteAccountState = {};

export function AccountDataPanel() {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteAccount,
    initialState,
  );

  return (
    <section
      className="border-t border-[var(--border-strong)] pt-7"
      aria-labelledby="account-data-heading"
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-start sm:gap-10">
        <div>
          <h2 id="account-data-heading" className="font-semibold">
            Your data
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            Download a copy of your documents, spreadsheets, and account
            details, or permanently delete your account.
          </p>
        </div>

        <div className="app-panel flex flex-col gap-4 rounded-xl p-4">
          <a
            href="/api/account/export"
            className="secondary-button w-full rounded-md px-3 py-2.5 text-center text-sm font-semibold"
          >
            Export my data
          </a>

          <div className="border-t border-[var(--border)] pt-4">
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--danger)] uppercase">
              Danger zone
            </p>
            <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
              Deleting your account permanently removes your documents,
              spreadsheets, comments, and settings. This cannot be undone.
            </p>

            {!confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="mt-3 text-xs font-semibold text-[var(--danger)]"
              >
                Delete my account
              </button>
            ) : (
              <form action={formAction} className="mt-3 flex flex-col gap-2">
                <label className="flex flex-col gap-1.5 text-xs font-medium">
                  Type DELETE to confirm
                  <input
                    type="text"
                    name="confirmation"
                    autoComplete="off"
                    required
                    className="app-input rounded-md px-3 py-2 text-sm outline-none"
                  />
                </label>
                {state.message && (
                  <p role="alert" className="text-xs text-[var(--danger)]">
                    {state.message}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={pending}
                    className="rounded-md bg-[var(--danger)] px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60"
                  >
                    {pending ? "Deleting…" : "Permanently delete account"}
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => setConfirming(false)}
                    className="text-xs text-[var(--muted)]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
