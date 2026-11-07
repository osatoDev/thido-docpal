import type { AiFeature } from "@prisma/client";

/**
 * User-facing names for the AI actions that consume credits. Kept separate
 * from `src/lib/ai/telemetry.ts` (which is server-only) so Settings surfaces
 * can render them.
 */
export const AI_CREDIT_ACTION_LABELS: Record<AiFeature, string> = {
  DOCUMENT_FOLLOWUPS: "Planning follow-ups",
  DOCUMENT_GENERATE: "Document generation",
  COMMENT_RESPOND: "Comment responses",
  TASK_SCHEDULE: "Scheduling tasks",
  PLAN_FEEDBACK: "Plan feedback",
};

export function aiCreditActionLabel(action: AiFeature): string {
  return AI_CREDIT_ACTION_LABELS[action] ?? action;
}
