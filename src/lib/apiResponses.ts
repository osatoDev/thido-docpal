import { NextResponse } from "next/server";

import type { AiAllowanceExceededError } from "@/lib/entitlements";

export function unauthorizedResponse() {
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

export function forbiddenResponse() {
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

export function aiAllowanceExceededResponse(error: AiAllowanceExceededError) {
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
