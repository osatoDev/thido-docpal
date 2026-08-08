import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAiModelId } from "@/lib/ai/models";
import {
  APPLICATION_STYLE_COOKIE_NAME,
  isApplicationStyle,
} from "@/lib/applicationStyle";
import { unauthorizedResponse } from "@/lib/apiResponses";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
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
    return unauthorizedResponse();
  }

  const body = await request.json().catch(() => ({}));
  const data: {
    aiCommentMode?: "PROPOSE" | "AUTO" | "AUTO_APPLY";
    aiModel?: string;
    documentStartMode?: "NEW_DOCUMENT" | "MOST_RECENT";
    applicationStyle?: string;
  } = {};

  if (body.aiCommentMode !== undefined) {
    if (
      body.aiCommentMode !== "PROPOSE" &&
      body.aiCommentMode !== "AUTO" &&
      body.aiCommentMode !== "AUTO_APPLY"
    ) {
      return NextResponse.json(
        { error: "aiCommentMode must be PROPOSE, AUTO, or AUTO_APPLY" },
        { status: 400 },
      );
    }
    data.aiCommentMode = body.aiCommentMode;
  }

  if (body.aiModel !== undefined) {
    if (!isAiModelId(body.aiModel)) {
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
      return NextResponse.json(
        { error: "Unsupported document start behavior" },
        { status: 400 },
      );
    }
    data.documentStartMode = body.documentStartMode;
  }

  if (body.applicationStyle !== undefined) {
    if (!isApplicationStyle(body.applicationStyle)) {
      return NextResponse.json(
        { error: "Unsupported application style" },
        { status: 400 },
      );
    }
    data.applicationStyle = body.applicationStyle;
  }

  if (Object.keys(data).length === 0) {
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
