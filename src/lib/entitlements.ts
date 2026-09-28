import "server-only";

import type { AiFeature } from "@prisma/client";

import { hasPaidSubscription } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import type { AiModelId } from "@/lib/ai/models";

/**
 * Free-vs-Pro AI usage gate. Weights and monthly allowances follow the
 * credits-not-tokens hybrid model recommended in docs/paid-plan-pricing.md:
 * customers never see raw token counts, only a monthly action allowance.
 * These specific numbers are a functional default pending final approval of
 * paid-plan entitlements (see docs/production-todo.md); the
 * mechanism, not the exact figures, is the part this module is responsible for.
 *
 * Every consumption also writes an `AiCreditCharge` ledger row so a user can
 * audit what their allowance was spent on (see docs/ai-credit-balance-and-audit.md).
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

/**
 * Maps the internal action kind onto the persisted `AiFeature` enum, reused
 * from AI telemetry so the ledger and `AiGeneration` speak the same vocabulary.
 */
const ACTION_FEATURE: Record<AiActionKind, AiFeature> = {
  DOCUMENT_FOLLOWUPS: "DOCUMENT_FOLLOWUPS",
  DOCUMENT_GENERATE: "DOCUMENT_GENERATE",
  COMMENT_RESPOND_DOCUMENT: "COMMENT_RESPOND",
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

export type AiAllowanceBreakdownEntry = {
  action: AiFeature;
  credits: number;
  count: number;
};

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

  const grouped = await prisma.aiCreditCharge.groupBy({
    by: ["action"],
    where: { userId, periodStart, refundedAt: null },
    _sum: { credits: true },
    _count: { _all: true },
  });
  const breakdown: AiAllowanceBreakdownEntry[] = grouped
    .map((row) => ({
      action: row.action,
      credits: row._sum.credits ?? 0,
      count: row._count._all,
    }))
    .sort((a, b) => b.credits - a.credits);

  return {
    plan,
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetsAt: nextAllowanceReset(now),
    breakdown,
  };
}

export type AiCreditHistoryEntry = {
  id: string;
  action: AiFeature;
  model: string;
  credits: number;
  refunded: boolean;
  periodStart: Date;
  createdAt: Date;
  documentId: string | null;
  documentTitle: string | null;
};

/**
 * Paginated, newest-first list of a user's AI credit charges for the usage
 * audit. Refunded charges are included and flagged rather than hidden.
 */
export async function getAiCreditHistory(
  userId: string,
  { limit = 50, cursor }: { limit?: number; cursor?: string } = {},
): Promise<{ entries: AiCreditHistoryEntry[]; nextCursor: string | null }> {
  const take = Math.min(Math.max(limit, 1), 200);
  const rows = await prisma.aiCreditCharge.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      action: true,
      model: true,
      credits: true,
      refundedAt: true,
      periodStart: true,
      createdAt: true,
      document: { select: { id: true, title: true } },
    },
  });

  const hasMore = rows.length > take;
  const entries: AiCreditHistoryEntry[] = rows.slice(0, take).map((row) => ({
    id: row.id,
    action: row.action,
    model: row.model,
    credits: row.credits,
    refunded: row.refundedAt !== null,
    periodStart: row.periodStart,
    createdAt: row.createdAt,
    documentId: row.document?.id ?? null,
    documentTitle: row.document?.title ?? null,
  }));

  return {
    entries,
    nextCursor: hasMore ? entries[entries.length - 1]!.id : null,
  };
}

/**
 * Checks the caller's monthly AI allowance and, if there's room, consumes it
 * immediately (before the AI call, not after) so usage is predictable and a
 * failed provider call never silently double-charges the allowance. The
 * consumption and its ledger row are written in one transaction. This is a
 * best-effort read-then-write, matching the pragmatic, non-distributed
 * approach `checkRateLimit` already takes for this deployment's current form;
 * a burst of truly concurrent requests from the same user could slightly
 * over-consume, but the 15-request-per-minute AI rate limit already bounds
 * that. Failed actions should call `refundAiCreditCharge` with the returned
 * `chargeId`.
 */
export async function checkAndConsumeAiAllowance(
  userId: string,
  kind: AiActionKind,
  model: string,
  options: { documentId?: string } = {},
): Promise<{
  plan: AiPlan;
  limit: number;
  used: number;
  remaining: number;
  chargeId: string;
}> {
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

  const used = usedSoFar + weight;
  const [, charge] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        aiCreditsUsed: used,
        aiCreditsPeriodStart:
          aiCreditsPeriodStart >= periodStart
            ? aiCreditsPeriodStart
            : periodStart,
      },
    }),
    prisma.aiCreditCharge.create({
      data: {
        userId,
        action: ACTION_FEATURE[kind],
        model,
        credits: weight,
        plan,
        periodStart,
        balanceAfter: used,
        documentId: options.documentId ?? null,
      },
      select: { id: true },
    }),
  ]);

  return { plan, limit, used, remaining: limit - used, chargeId: charge.id };
}

/**
 * Best-effort link from a credit charge to the telemetry row for the same AI
 * call, for internal cost reconciliation. Never throws: the audit record is
 * complete without it.
 */
export async function linkAiCreditChargeToGeneration(
  chargeId: string,
  aiGenerationId: string,
): Promise<void> {
  try {
    await prisma.aiCreditCharge.update({
      where: { id: chargeId },
      data: { aiGenerationId },
    });
  } catch {
    // Non-critical metadata; leave the charge unlinked.
  }
}

/**
 * Returns the credits from a failed action to the user. Stamps `refundedAt`
 * on the ledger row and, when the charge belongs to the still-current
 * allowance period, decrements the running `User.aiCreditsUsed` counter.
 * Idempotent and safe to call on an unknown or already-refunded charge.
 */
export async function refundAiCreditCharge(chargeId: string): Promise<void> {
  const charge = await prisma.aiCreditCharge.findUnique({
    where: { id: chargeId },
    select: {
      userId: true,
      credits: true,
      periodStart: true,
      refundedAt: true,
    },
  });
  if (!charge || charge.refundedAt) return;

  const periodStart = currentAllowancePeriodStart();
  const belongsToCurrentPeriod =
    charge.periodStart.getTime() === periodStart.getTime();

  await prisma.$transaction(async (tx) => {
    const fresh = await tx.aiCreditCharge.findUnique({
      where: { id: chargeId },
      select: { refundedAt: true },
    });
    if (!fresh || fresh.refundedAt) return;

    await tx.aiCreditCharge.update({
      where: { id: chargeId },
      data: { refundedAt: new Date() },
    });

    if (!belongsToCurrentPeriod) return;
    const user = await tx.user.findUnique({
      where: { id: charge.userId },
      select: { aiCreditsUsed: true, aiCreditsPeriodStart: true },
    });
    if (!user || user.aiCreditsPeriodStart < periodStart) return;
    await tx.user.update({
      where: { id: charge.userId },
      data: { aiCreditsUsed: Math.max(0, user.aiCreditsUsed - charge.credits) },
    });
  });
}
