import { isAutosaveDelaySeconds } from "@/lib/autosave";
import { isPlanFeedbackDailyLimit } from "@/lib/planFeedbackPolicy";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiModelId } from "@/lib/ai/models";
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
    autosaveDelaySeconds?: number;
    aiModel?: string;
    checklistMoveControls?: boolean;
    planFeedbackDailyLimit?: number;
  } = {};

  if (body.autosaveDelaySeconds !== undefined) {
    if (!isAutosaveDelaySeconds(body.autosaveDelaySeconds)) {
      await reportServerError(new Error("Unsupported autosave delay"), {
        source: "settings",
        operation: "invalid-autosave-delay",
        status: 400,
      });
      return NextResponse.json({ error: "Unsupported autosave delay" }, { status: 400 });
    }
    data.autosaveDelaySeconds = body.autosaveDelaySeconds;
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

  if (body.planFeedbackDailyLimit !== undefined) {
    if (!isPlanFeedbackDailyLimit(body.planFeedbackDailyLimit)) {
      await reportServerError(new Error("Unsupported plan feedback limit"), {
        source: "settings",
        operation: "invalid-plan-feedback-limit",
        status: 400,
      });
      return NextResponse.json(
        { error: "Unsupported plan feedback limit" },
        { status: 400 },
      );
    }
    data.planFeedbackDailyLimit = body.planFeedbackDailyLimit;
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

  return NextResponse.json({ settings });
}
