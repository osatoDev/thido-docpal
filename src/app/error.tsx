"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Brand } from "@/components/Brand";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    void import("@/lib/rollbar/client")
      .then(({ reportClientError }) => {
        reportClientError(error, {
          source: "next-error-boundary",
          digest: error.digest,
        });
      })
      .catch(() => {
        // The recovery UI must remain usable if telemetry cannot load.
      });
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6 sm:p-8">
      <section className="app-panel flex w-full max-w-lg flex-col items-center rounded-3xl p-8 text-center sm:p-10">
        <Brand href="/plan" />
        <p className="page-kicker mt-8">Unexpected error</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em]">
          Something went wrong.
        </h1>
        <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--muted)]">
          The error has been reported. You can try this page again or return
          to your documents.
        </p>
        {error.digest && (
          <p className="mt-3 font-mono text-xs text-[var(--muted-soft)]">
            Reference: {error.digest}
          </p>
        )}
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="primary-button rounded-md px-4 py-2 text-sm font-medium"
          >
            Try again
          </button>
          <Link
            href="/plan"
            className="secondary-button rounded-md px-4 py-2 text-sm font-medium"
          >
            Return to documents
          </Link>
        </div>
      </section>
    </main>
  );
}
