import { z } from "zod";

export const scheduleEntrySchema = z.object({
  kind: z
    .enum(["task", "request"])
    .describe("task: something the user will do, to file in the plan. request: the user asks Thido itself to find, research, suggest, compare or list things now"),
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

export const planRequestSchema = z.object({
  summary: z
    .string()
    .describe("One or two sentences answering the request, in plain text"),
  options: z
    .array(
      z.object({
        title: z.string().describe("Short name of the option, such as the venue and what is on"),
        details: z.string().describe("One or two sentences: when, where, and why it fits the plan and the user's constraints"),
        suggested_time: z
          .string()
          .nullable()
          .describe("24-hour start time as HH:MM if the option fits a gap in the plan, otherwise null"),
        task: z.string().describe("A short checklist line to add to the plan if the user picks this option, without the time"),
        source_url: z
          .string()
          .nullable()
          .describe("URL of the web page that supports this option, copied exactly from a search result, or null"),
      }),
    )
    .describe("The options, best first, at most 10"),
});
export type PlanRequestOutput = z.infer<typeof planRequestSchema>;

export const dailyEmailInsightsSchema = z.object({
  feedback: z
    .array(z.string())
    .describe("3 to 5 points on today's plan and on what was checked off yesterday, each one or two short sentences of plain text"),
  suggestions: z
    .array(z.string())
    .describe("3 to 5 suggestions for upcoming plans, drawn from the whole list, each one or two short sentences of plain text"),
});
export type DailyEmailInsightsOutput = z.infer<typeof dailyEmailInsightsSchema>;

export const planFeedbackSchema = z.object({
  feedback: z.string().min(1),
});
export type PlanFeedbackOutput = z.infer<typeof planFeedbackSchema>;
