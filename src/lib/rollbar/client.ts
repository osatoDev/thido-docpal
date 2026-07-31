"use client";

import Rollbar from "rollbar";

import { baseRollbarConfig } from "@/lib/rollbar/config";
import { sanitizeRollbarValue } from "@/lib/rollbar/sanitize";

const accessToken =
  process.env
    .NEXT_PUBLIC_ROLLBAR_THIDO_DOCPAL_CLIENT_TOKEN_1785444690;
const enabled =
  Boolean(accessToken) && process.env.NODE_ENV === "production";

export const clientRollbar = new Rollbar({
  ...baseRollbarConfig(),
  accessToken,
  enabled,
  captureUncaught: true,
  captureUnhandledRejections: true,
  environment: process.env.THIDO_DEPLOYMENT_ENV ?? "unknown",
  payload: {
    environment: process.env.THIDO_DEPLOYMENT_ENV ?? "unknown",
    client: {
      javascript: {
        code_version: process.env.THIDO_COMMIT_SHA || undefined,
        source_map_enabled: true,
      },
    },
  },
});

type ClientErrorContext = {
  source: "next-error-boundary" | "next-global-error" | "client-action";
  action?: string;
  digest?: string;
  status?: number;
};

export function reportClientError(
  error: unknown,
  context: ClientErrorContext,
) {
  const reportable =
    error instanceof Error
      ? error
      : new Error("A non-Error value was thrown in the browser");
  const safeContext = sanitizeRollbarValue(context) as Record<string, unknown>;
  clientRollbar.error(reportable, safeContext);
}
