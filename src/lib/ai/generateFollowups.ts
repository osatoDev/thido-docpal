import { prisma } from "@/lib/prisma";
import { anthropic } from "@/lib/ai/client";
import { supportsAdaptiveThinking } from "@/lib/ai/models";
import { getUserAiModel } from "@/lib/ai/userModel";
import { followupQuestionsSchema } from "@/lib/ai/schemas";
import {
  startAiGeneration,
  type TrackedAnthropicMessage,
} from "@/lib/ai/telemetry";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/**
 * Generates (and persists) the AI follow-up questions for a document, based
 * on its initial brief or prompt answers. Idempotent: returns the existing
 * follow-ups if they were already generated.
 */
export async function generateFollowupQuestions(documentId: string) {
  const existing = await prisma.promptAnswer.findMany({
    where: { documentId, stage: "FOLLOWUP" },
    orderBy: { order: "asc" },
  });
  if (existing.length > 0) return existing;

  const initialAnswers = await prisma.promptAnswer.findMany({
    where: { documentId, stage: "INITIAL" },
    orderBy: { order: "asc" },
  });
  if (initialAnswers.length === 0) {
    throw new Error("Answer the initial prompts first");
  }

  const qaText = initialAnswers
    .map(
      (a) =>
        `Q: ${a.question}\nA: ${a.answer.trim() || "Not provided. Infer a reasonable default."}`,
    )
    .join("\n\n");

  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { ownerId: true },
  });
  if (!document) throw new Error("Document not found");
  const model = await getUserAiModel(document.ownerId);
  const telemetry = await startAiGeneration({
    feature: "DOCUMENT_FOLLOWUPS",
    model,
    userId: document.ownerId,
    documentId,
  });
  let trackedMessage: TrackedAnthropicMessage | undefined;

  try {
    const message = await anthropic.messages.parse({
      model,
      max_tokens: 2000,
      ...(supportsAdaptiveThinking(model)
        ? { thinking: { type: "adaptive" as const } }
        : {}),
      system:
        "You are helping a user plan a document before it is written. " +
        "Given their initial brief about the document " +
        "they want, ask 3-5 tailored follow-up questions that would " +
        "meaningfully improve the quality and specificity of the final " +
        "document. Ask about concrete details the initial answers left " +
        "vague, not generic restatements of the same questions. The user may " +
        "skip any follow-up, so make reasonable assumptions when needed.",
      messages: [{ role: "user", content: qaText }],
      output_config: { format: zodOutputFormat(followupQuestionsSchema) },
    });
    trackedMessage = message;

    const parsed = message.parsed_output;
    if (!parsed) {
      throw new Error("Failed to generate follow-up questions");
    }

    const followups = await prisma.$transaction(
      parsed.questions.map((q) =>
        prisma.promptAnswer.create({
          data: {
            documentId,
            stage: "FOLLOWUP",
            order: q.order,
            question: q.question,
            answer: "",
          },
        }),
      ),
    );
    await telemetry.succeed(message);
    return followups;
  } catch (error) {
    await telemetry.fail(error, trackedMessage);
    throw error;
  }
}
