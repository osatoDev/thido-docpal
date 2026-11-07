import { z } from "zod";

export const scheduleEntrySchema = z.object({
  date: z
    .string()
    .nullable()
    .describe("Calendar date for the task as YYYY-MM-DD, or null if no day can be determined"),
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
