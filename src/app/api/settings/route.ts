import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiModelId } from "@/lib/ai/models";
import {
  APPLICATION_STYLE_COOKIE_NAME,
  isApplicationStyle,
} from "@/lib/applicationStyle";
import { unauthorizedResponse } from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: {},
    create: { userId: session.user.id },
  });

  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  const body = await request.json().catch(() => ({}));
  const data: {
    aiCommentMode?: "PROPOSE" | "AUTO" | "AUTO_APPLY";
    aiModel?: string;
    documentStartMode?: "NEW_DOCUMENT" | "MOST_RECENT";
    applicationStyle?: string;
    checklistMoveControls?: boolean;
  } = {};

  if (body.aiCommentMode !== undefined) {
    if (
      body.aiCommentMode !== "PROPOSE" &&
      body.aiCommentMode !== "AUTO" &&
      body.aiCommentMode !== "AUTO_APPLY"
    ) {
      await reportServerError(new Error("Invalid aiCommentMode"), {
        source: "settings",
        operation: "invalid-ai-comment-mode",
        status: 400,
      });
      return NextResponse.json(
        { error: "aiCommentMode must be PROPOSE, AUTO, or AUTO_APPLY" },
        { status: 400 },
      );
    }
    data.aiCommentMode = body.aiCommentMode;
  }

  if (body.aiModel !== undefined) {
    if (!isAiModelId(body.aiModel)) {
      await reportServerError(new Error("Unsupported AI model"), {
        source: "settings",
        operation: "invalid-ai-model",
        status: 400,
      });
      return NextResponse.json(
        { error: "Unsupported AI model" },
        { status: 400 },
      );
    }
    data.aiModel = body.aiModel;
  }

  if (body.documentStartMode !== undefined) {
    if (
      body.documentStartMode !== "NEW_DOCUMENT" &&
      body.documentStartMode !== "MOST_RECENT"
    ) {
      await reportServerError(new Error("Unsupported document start behavior"), {
        source: "settings",
        operation: "invalid-document-start-mode",
        status: 400,
      });
      return NextResponse.json(
        { error: "Unsupported document start behavior" },
        { status: 400 },
      );
    }
    data.documentStartMode = body.documentStartMode;
  }

  if (body.applicationStyle !== undefined) {
    if (!isApplicationStyle(body.applicationStyle)) {
      await reportServerError(new Error("Unsupported application style"), {
        source: "settings",
        operation: "invalid-application-style",
        status: 400,
      });
      return NextResponse.json(
        { error: "Unsupported application style" },
        { status: 400 },
      );
    }
    data.applicationStyle = body.applicationStyle;
  }

  if (body.checklistMoveControls !== undefined) {
    if (typeof body.checklistMoveControls !== "boolean") {
      await reportServerError(
        new Error("checklistMoveControls must be a boolean"),
        {
          source: "settings",
          operation: "invalid-checklist-move-controls",
          status: 400,
        },
      );
      return NextResponse.json(
        { error: "checklistMoveControls must be a boolean" },
        { status: 400 },
      );
    }
    data.checklistMoveControls = body.checklistMoveControls;
  }

  if (Object.keys(data).length === 0) {
    await reportServerError(new Error("No supported settings were provided"), {
      source: "settings",
      operation: "no-settings-provided",
      status: 400,
    });
    return NextResponse.json(
      { error: "No supported settings were provided" },
      { status: 400 },
    );
  }

  const settings = await prisma.userSettings.upsert({
    where: { userId: session.user.id },
    update: data,
    create: { userId: session.user.id, ...data },
  });

  const response = NextResponse.json({ settings });
  if (data.applicationStyle) {
    response.cookies.set(APPLICATION_STYLE_COOKIE_NAME, data.applicationStyle, {
      httpOnly: false,
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return response;
}
