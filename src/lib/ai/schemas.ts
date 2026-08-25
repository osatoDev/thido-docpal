import { z } from "zod";

export const followupQuestionsSchema = z.object({
  questions: z
    .array(
      z.object({
        order: z.number().int().min(1),
        question: z.string().min(1),
      }),
    )
    .min(3)
    .max(5),
});
export type FollowupQuestions = z.infer<typeof followupQuestionsSchema>;

export const commentBatchResponseSchema = z.object({
  summary: z.string().min(1),
  responses: z.array(
    z.object({
      comment_id: z.string().min(1),
      reply: z.string().min(1),
    }),
  ),
  revised_document: z.string().nullable(),
});
export type CommentBatchResponse = z.infer<typeof commentBatchResponseSchema>;
