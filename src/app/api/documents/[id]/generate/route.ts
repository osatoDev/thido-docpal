import { after } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getDocumentForUser } from "@/lib/documentAuth";
import { anthropic } from "@/lib/ai/client";
import { supportsAdaptiveThinking } from "@/lib/ai/models";
import { getUserAiModel } from "@/lib/ai/userModel";
import {
  startAiGeneration,
  type TrackedAnthropicMessage,
} from "@/lib/ai/telemetry";
import { markdownToTiptapJSON } from "@/lib/markdownToTiptap";
import { checkRateLimit } from "@/lib/rateLimit";
import { unauthorizedResponse } from "@/lib/apiResponses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return unauthorizedResponse();
  }

  if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
    return NextResponse.json(
      { error: "Too many AI requests — please slow down" },
      { status: 429 },
    );
  }

  const { id } = await params;
  const document = await getDocumentForUser(
    id,
    session.user.id,
    session.user.email,
    "FULL",
  );
  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const promptAnswers = await prisma.promptAnswer.findMany({
    where: { documentId: id },
    orderBy: [{ stage: "asc" }, { order: "asc" }],
  });
  if (promptAnswers.length === 0) {
    return NextResponse.json(
      { error: "Complete the prompt wizard first" },
      { status: 400 },
    );
  }

  const qaText = promptAnswers
    .map(
      (a) =>
        `Q: ${a.question}\nA: ${a.answer.trim() || "Not provided — infer a reasonable default."}`,
    )
    .join("\n\n");

  const model = await getUserAiModel(session.user.id);
  const telemetry = await startAiGeneration({
    feature: "DOCUMENT_GENERATE",
    model,
    userId: session.user.id,
    documentId: id,
  });

  try {
    await prisma.document.update({
      where: { id },
      data: { status: "GENERATING" },
    });

    const claudeStream = anthropic.messages.stream({
      model,
      max_tokens: 16000,
      ...(supportsAdaptiveThinking(model)
        ? { thinking: { type: "adaptive" as const } }
        : {}),
      system:
        "You write complete, well-structured documents from a user's brief " +
        "and any planning answers. Infer sensible choices wherever the user " +
        "left an answer blank, without calling attention to the missing input. " +
        "Respond with only the document " +
        "itself, formatted as Markdown (headings, paragraphs, and lists as " +
        "appropriate) — no preamble, no meta-commentary about the document, " +
        "and no closing remarks.",
      messages: [{ role: "user", content: qaText }],
    });

    let fullText = "";
    let trackedMessage: TrackedAnthropicMessage | undefined;
    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      start(controller) {
        claudeStream.on("text", (delta) => {
          telemetry.markFirstToken();
          fullText += delta;
          controller.enqueue(encoder.encode(delta));
        });
        claudeStream.on("error", (err) => {
          controller.error(err);
        });
        claudeStream.on("end", () => {
          controller.close();
        });
      },
    });

    after(async () => {
      try {
        const message = await claudeStream.finalMessage();
        trackedMessage = message;
        const content = await markdownToTiptapJSON(fullText);
        await prisma.document.update({
          where: { id },
          data: { content, status: "READY" },
        });
        await telemetry.succeed(message);
      } catch (error) {
        await telemetry.fail(error, trackedMessage);
        console.error("Document generation failed", error);
        await prisma.document.update({
          where: { id },
          data: { status: "DRAFTING" },
        });
      }
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-AI-Generation-Id": telemetry.id,
      },
    });
  } catch (error) {
    await telemetry.fail(error);
    await prisma.document.update({
      where: { id },
      data: { status: "DRAFTING" },
    });
    throw error;
  }
}
