import { prisma } from "@/lib/prisma";
import { anthropic, CLAUDE_MODEL } from "@/lib/ai/client";
import { followupQuestionsSchema } from "@/lib/ai/schemas";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

/**
 * Generates (and persists) the AI follow-up questions for a document, based
 * on its 5 initial prompt answers. Idempotent — returns the existing
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
    .map((a) => `Q: ${a.question}\nA: ${a.answer}`)
    .join("\n\n");

  const message = await anthropic.messages.parse({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    system:
      "You are helping a user plan a document before it is written. " +
      "Given their answers to five initial questions about the document " +
      "they want, ask 3-5 tailored follow-up questions that would " +
      "meaningfully improve the quality and specificity of the final " +
      "document. Ask about concrete details the initial answers left " +
      "vague — not generic restatements of the same questions.",
    messages: [{ role: "user", content: qaText }],
    output_config: { format: zodOutputFormat(followupQuestionsSchema) },
  });

  const parsed = message.parsed_output;
  if (!parsed) {
    throw new Error("Failed to generate follow-up questions");
  }

  return prisma.$transaction(
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
}
