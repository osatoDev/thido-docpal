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

export const commentResponseSchema = z.object({
  intent: z.enum(["question", "change_request", "feedback"]),
  reply: z.string().min(1),
  proposed_text: z.string().optional(),
});
export type CommentResponse = z.infer<typeof commentResponseSchema>;
