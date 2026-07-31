import type Rollbar from "rollbar";

import { sanitizeRollbarPayload } from "@/lib/rollbar/sanitize";

const additionalScrubFields = [
  "accessToken",
  "answer",
  "authorization",
  "commentText",
  "content",
  "cookie",
  "documentContent",
  "email",
  "password",
  "prompt",
  "proposedText",
  "quotedText",
  "requestBody",
  "secret",
  "token",
];

export function baseRollbarConfig(): Rollbar.Configuration {
  return {
    autoInstrument: false,
    captureEmail: false,
    captureIp: false,
    captureUsername: false,
    ignoreDuplicateErrors: true,
    maxTelemetryEvents: 0,
    overwriteScrubFields: false,
    replay: { enabled: false },
    reportLevel: "error",
    scrubFields: additionalScrubFields,
    scrubHeaders: [
      "authorization",
      "cookie",
      "set-cookie",
      "x-api-key",
    ],
    scrubRequestBody: true,
    scrubTelemetryInputs: true,
    transform(data) {
      sanitizeRollbarPayload(data);
    },
  };
}
