import { z } from "zod";

export const dailyEmailInsightsSchema = z.object({
  feedback: z
    .array(z.string())
    .describe("3 to 5 points on today's plan and on what was checked off yesterday, each one or two short sentences of plain text"),
  suggestions: z
    .array(z.string())
    .describe("3 to 5 suggestions for upcoming plans, drawn from the whole list, each one or two short sentences of plain text"),
});
export type DailyEmailInsightsOutput = z.infer<typeof dailyEmailInsightsSchema>;
