"use client";

import { useEffect } from "react";

export default function GlobalError({
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
          source: "next-global-error",
          digest: error.digest,
        });
      })
      .catch(() => {
        // The recovery UI must remain usable if telemetry cannot load.
      });
  }, [error]);

  return (
    <html lang="en">
      <body>
        <title>Something went wrong — Thido</title>
        <main
          style={{
            alignItems: "center",
            background: "#f4f2ed",
            color: "#222622",
            display: "flex",
            fontFamily: "system-ui, sans-serif",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "1.5rem",
          }}
        >
          <section style={{ maxWidth: "30rem", textAlign: "center" }}>
            <p style={{ fontFamily: "serif", fontSize: "1.8rem" }}>Thido</p>
            <h1 style={{ fontSize: "2rem", marginTop: "2rem" }}>
              Something went wrong.
            </h1>
            <p style={{ color: "#646963", lineHeight: 1.6 }}>
              The error has been reported. Try loading Thido again.
            </p>
            <button
              type="button"
              onClick={() => unstable_retry()}
              style={{
                background: "#222622",
                border: 0,
                borderRadius: "0.4rem",
                color: "#faf9f6",
                cursor: "pointer",
                font: "inherit",
                marginTop: "1.5rem",
                padding: "0.7rem 1rem",
              }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
