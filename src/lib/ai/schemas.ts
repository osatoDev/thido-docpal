import { z } from "zod";

export const scheduleEntrySchema = z.object({
  dates: z
    .array(z.string())
    .describe("Every calendar date the task goes on, as YYYY-MM-DD: one date for a one-off task, one per day for a repeating task, or empty if no day can be determined"),
  time: z
    .string()
    .nullable()
    .describe("24-hour start time as HH:MM, or null if no time was given"),
  task: z
    .string()
    .describe("The task itself, without the date or time words"),
  clarification: z
    .string()
    .nullable()
    .describe("A short question for the user when the date is missing or ambiguous, otherwise null"),
});
export type ScheduleEntry = z.infer<typeof scheduleEntrySchema>;

export const planFeedbackSchema = z.object({
  feedback: z.string().min(1),
});
export type PlanFeedbackOutput = z.infer<typeof planFeedbackSchema>;
