import { NextResponse } from "next/server";

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
