import "server-only";

import { hasPaidSubscription } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import type { AiModelId } from "@/lib/ai/models";

/**
 * Free-vs-Pro AI usage gate. Weights and monthly allowances follow the
 * credits-not-tokens hybrid model recommended in docs/paid-plan-pricing.md:
 * customers never see raw token counts, only a monthly action allowance.
 * These specific numbers are a functional default pending final approval of
 * paid-plan entitlements (see docs/paid-plan-implementation-status.md); the
 * mechanism, not the exact figures, is the part this module is responsible for.
 */
export type AiActionKind =
  | "DOCUMENT_FOLLOWUPS"
  | "DOCUMENT_GENERATE"
  | "COMMENT_RESPOND_DOCUMENT";

const BASE_ACTION_WEIGHT: Record<AiActionKind, number> = {
  DOCUMENT_FOLLOWUPS: 1,
  DOCUMENT_GENERATE: 5,
  COMMENT_RESPOND_DOCUMENT: 5,
};

const PREMIUM_MODEL_MULTIPLIER = 2;
const PREMIUM_MODELS = new Set<AiModelId>(["claude-opus-4-8"]);

export const MONTHLY_AI_ALLOWANCE = {
  free: 30,
  pro: 300,
} as const;

export type AiPlan = keyof typeof MONTHLY_AI_ALLOWANCE;

export function actionCreditWeight(kind: AiActionKind, model: string): number {
  const base = BASE_ACTION_WEIGHT[kind];
  const multiplier = PREMIUM_MODELS.has(model as AiModelId)
    ? PREMIUM_MODEL_MULTIPLIER
    : 1;
  return base * multiplier;
}

export function currentAllowancePeriodStart(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

export function nextAllowanceReset(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
}

export function allowanceExceededMessage({
  plan,
  limit,
  used,
  resetsAt,
}: {
  plan: AiPlan;
  limit: number;
  used: number;
  resetsAt: Date;
}): string {
  const resetLabel = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(resetsAt);
  const upgradeHint =
    plan === "free"
      ? " Upgrade to Thido Pro in Settings for a higher monthly allowance."
      : "";
  return (
    `You've used this month's ${plan === "pro" ? "Pro" : "Free beta"} AI allowance ` +
    `(${used} of ${limit} actions). It resets on ${resetLabel}.${upgradeHint}`
  );
}

export class AiAllowanceExceededError extends Error {
  readonly plan: AiPlan;
  readonly limit: number;
  readonly used: number;
  readonly resetsAt: Date;

  constructor(details: {
    plan: AiPlan;
    limit: number;
    used: number;
    resetsAt: Date;
  }) {
    super(allowanceExceededMessage(details));
    this.name = "AiAllowanceExceededError";
    this.plan = details.plan;
    this.limit = details.limit;
    this.used = details.used;
    this.resetsAt = details.resetsAt;
  }
}

function usedInCurrentPeriod(
  aiCreditsUsed: number,
  aiCreditsPeriodStart: Date,
  periodStart: Date,
) {
  return aiCreditsPeriodStart >= periodStart ? aiCreditsUsed : 0;
}

async function planForUser(userId: string) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      stripeSubscriptionStatus: true,
      aiCreditsUsed: true,
      aiCreditsPeriodStart: true,
    },
  });
  const plan: AiPlan = hasPaidSubscription(user.stripeSubscriptionStatus)
    ? "pro"
    : "free";
  return { plan, ...user };
}

export async function getAiAllowanceStatus(userId: string) {
  const now = new Date();
  const periodStart = currentAllowancePeriodStart(now);
  const { plan, aiCreditsUsed, aiCreditsPeriodStart } =
    await planForUser(userId);
  const limit = MONTHLY_AI_ALLOWANCE[plan];
  const used = usedInCurrentPeriod(
    aiCreditsUsed,
    aiCreditsPeriodStart,
    periodStart,
  );
  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: nextAllowanceReset(now),
  };
}

/**
 * Checks the caller's monthly AI allowance and, if there's room, consumes it
 * immediately (before the AI call, not after) so usage is predictable and a
 * failed provider call never silently double-charges the allowance. This is
 * a best-effort read-then-write, matching the pragmatic, non-distributed
 * approach `checkRateLimit` already takes for this deployment's current
 * form; a burst of truly concurrent requests from the same user could
 * slightly over-consume, but the 15-request-per-minute AI rate limit already
 * bounds that.
 */
export async function checkAndConsumeAiAllowance(
  userId: string,
  kind: AiActionKind,
  model: string,
): Promise<{ plan: AiPlan; limit: number; used: number; remaining: number }> {
  const now = new Date();
  const periodStart = currentAllowancePeriodStart(now);
  const resetsAt = nextAllowanceReset(now);
  const weight = actionCreditWeight(kind, model);

  const { plan, aiCreditsUsed, aiCreditsPeriodStart } =
    await planForUser(userId);
  const limit = MONTHLY_AI_ALLOWANCE[plan];
  const usedSoFar = usedInCurrentPeriod(
    aiCreditsUsed,
    aiCreditsPeriodStart,
    periodStart,
  );

  if (usedSoFar + weight > limit) {
    throw new AiAllowanceExceededError({
      plan,
      limit,
      used: usedSoFar,
      resetsAt,
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      aiCreditsUsed: usedSoFar + weight,
      aiCreditsPeriodStart:
        aiCreditsPeriodStart >= periodStart
          ? aiCreditsPeriodStart
          : periodStart,
    },
  });

  const used = usedSoFar + weight;
  return { plan, limit, used, remaining: limit - used };
}
