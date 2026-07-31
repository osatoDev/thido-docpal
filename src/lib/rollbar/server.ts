import "server-only";

import Rollbar from "rollbar";

import { baseRollbarConfig } from "@/lib/rollbar/config";
import { sanitizeRollbarValue } from "@/lib/rollbar/sanitize";

const accessToken =
  process.env.ROLLBAR_THIDO_DOCPAL_SERVER_TOKEN_1785444690;
const enabled =
  Boolean(accessToken) && process.env.NODE_ENV === "production";

const serverRollbar = new Rollbar({
  ...baseRollbarConfig(),
  accessToken,
  enabled,
  captureUncaught: false,
  captureUnhandledRejections: false,
  environment:
    process.env.VERCEL_ENV ??
    process.env.THIDO_DEPLOYMENT_ENV ??
    process.env.NODE_ENV ??
    "unknown",
  codeVersion: process.env.VERCEL_GIT_COMMIT_SHA,
  nodeSourceMaps: true,
});

export type ServerErrorContext = {
  source: string;
  operation?: string;
  route?: string;
  routeType?: string;
  requestMethod?: string;
  requestId?: string;
  feature?: string;
  model?: string;
  generationId?: string;
  providerRequestId?: string | null;
  eventId?: string;
  eventType?: string;
  errorCode?: string | null;
  status?: number;
};

export async function reportServerError(
  error: unknown,
  context: ServerErrorContext,
) {
  if (!enabled) return;

  const reportable =
    error instanceof Error
      ? error
      : new Error("A non-Error value was thrown on the server");
  const safeContext = sanitizeRollbarValue(context) as Record<string, unknown>;

  await new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve();
    };
    const timeout = setTimeout(finish, 2_000);

    try {
      serverRollbar.error(reportable, safeContext, finish);
    } catch {
      finish();
    }
  });
}
