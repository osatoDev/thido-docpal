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
import {
  AiAllowanceExceededError,
  checkAndConsumeAiAllowance,
  linkAiCreditChargeToGeneration,
  refundAiCreditCharge,
} from "@/lib/entitlements";
import { checkRateLimit } from "@/lib/rateLimit";
import {
  aiAllowanceExceededResponse,
  unauthorizedResponse,
} from "@/lib/apiResponses";
import { reportServerError } from "@/lib/rollbar/server";
import { recordDocumentRevision } from "@/lib/documentRevisions";
import { DocumentRevisionSource } from "@prisma/client";
import { inferDocumentTitle } from "@/lib/documentPersistence";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return await unauthorizedResponse();
  }

  if (!checkRateLimit(`ai:${session.user.id}`, 15, 60_000)) {
    await reportServerError(new Error("Rate limited document generation"), {
      source: "document-generate",
      operation: "rate-limited",
      status: 429,
    });
    return NextResponse.json(
      { error: "Too many AI requests. Please slow down." },
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
    await reportServerError(new Error("Document not found"), {
      source: "document-generate",
      operation: "not-found",
      status: 404,
      documentId: id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const promptAnswers = await prisma.promptAnswer.findMany({
    where: { documentId: id },
    orderBy: [{ stage: "asc" }, { order: "asc" }],
  });
  if (promptAnswers.length === 0) {
    await reportServerError(new Error("Prompt wizard not completed"), {
      source: "document-generate",
      operation: "prompt-wizard-incomplete",
      status: 400,
      documentId: id,
    });
    return NextResponse.json(
      { error: "Complete the prompt wizard first" },
      { status: 400 },
    );
  }

  const qaText = promptAnswers
    .map(
      (a) =>
        `Q: ${a.question}\nA: ${a.answer.trim() || "Not provided. Infer a reasonable default."}`,
    )
    .join("\n\n");

  const model = await getUserAiModel(session.user.id);
  let chargeId: string;
  try {
    ({ chargeId } = await checkAndConsumeAiAllowance(
      session.user.id,
      "DOCUMENT_GENERATE",
      model,
      { documentId: id },
    ));
  } catch (error) {
    if (error instanceof AiAllowanceExceededError) {
      return await aiAllowanceExceededResponse(error);
    }
    throw error;
  }

  const telemetry = await startAiGeneration({
    feature: "DOCUMENT_GENERATE",
    model,
    userId: session.user.id,
    documentId: id,
  });
  await linkAiCreditChargeToGeneration(chargeId, telemetry.id);

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
        "appropriate). Do not include a preamble, meta-commentary about the document, " +
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
        const inferredTitle = document.titleManuallySet
          ? null
          : inferDocumentTitle(content);
        await prisma.$transaction(async (transaction) => {
          const updatedDocument = await transaction.document.update({
            where: { id },
            data: {
              content,
              ...(inferredTitle ? { title: inferredTitle } : {}),
              status: "READY",
              revision: { increment: 1 },
            },
          });
          await recordDocumentRevision(transaction, updatedDocument, {
            source: DocumentRevisionSource.AI,
            actorId: session.user.id,
          });
        });
        await telemetry.succeed(message);
      } catch (error) {
        await telemetry.fail(error, trackedMessage);
        // Nothing was saved for the user, so return the credits.
        await refundAiCreditCharge(chargeId);
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
    await refundAiCreditCharge(chargeId);
    await prisma.document.update({
      where: { id },
      data: { status: "DRAFTING" },
    });
    throw error;
  }
}
