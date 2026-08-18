import { NextResponse } from "next/server";

import type { AiAllowanceExceededError } from "@/lib/entitlements";
import { reportServerError } from "@/lib/rollbar/server";

export async function unauthorizedResponse() {
  await reportServerError(new Error("Unauthorized request"), {
    source: "api-response",
    operation: "unauthorized-response",
    status: 401,
  });

  return NextResponse.json(
    {
      error: {
        code: "UNAUTHORIZED",
        message: "Please sign in to continue.",
      },
    },
    { status: 401 },
  );
}

export async function forbiddenResponse() {
  await reportServerError(new Error("Forbidden request"), {
    source: "api-response",
    operation: "forbidden-response",
    status: 403,
  });

  return NextResponse.json(
    {
      error: {
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      },
    },
    { status: 403 },
  );
}

export async function aiAllowanceExceededResponse(
  error: AiAllowanceExceededError,
) {
  await reportServerError(error, {
    source: "api-response",
    operation: "ai-allowance-exceeded-response",
    status: 402,
  });

  return NextResponse.json(
    {
      error: {
        code: "AI_ALLOWANCE_EXCEEDED",
        message: error.message,
        plan: error.plan,
        limit: error.limit,
        used: error.used,
        resetsAt: error.resetsAt.toISOString(),
      },
    },
    { status: 402 },
  );
}
