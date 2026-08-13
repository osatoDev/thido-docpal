import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      update: mocks.update,
    },
  },
}));

import {
  actionCreditWeight,
  AiAllowanceExceededError,
  allowanceExceededMessage,
  checkAndConsumeAiAllowance,
  currentAllowancePeriodStart,
  getAiAllowanceStatus,
  MONTHLY_AI_ALLOWANCE,
  nextAllowanceReset,
} from "@/lib/entitlements";

describe("AI action credit weights", () => {
  it("weighs a short selection action as one credit on a non-premium model", () => {
    expect(actionCreditWeight("COMMENT_RESPOND_SELECTION", "claude-sonnet-5")).toBe(1);
    expect(actionCreditWeight("DOCUMENT_FOLLOWUPS", "claude-haiku-4-5")).toBe(1);
  });

  it("weighs whole-document actions higher than short actions", () => {
    expect(actionCreditWeight("DOCUMENT_GENERATE", "claude-sonnet-5")).toBe(5);
    expect(actionCreditWeight("COMMENT_RESPOND_DOCUMENT", "claude-sonnet-5")).toBe(5);
  });

  it("doubles the weight for the premium Opus model", () => {
    expect(actionCreditWeight("COMMENT_RESPOND_SELECTION", "claude-opus-4-8")).toBe(2);
    expect(actionCreditWeight("DOCUMENT_GENERATE", "claude-opus-4-8")).toBe(10);
  });
});

describe("allowance period boundaries", () => {
  it("anchors the period start to the first of the UTC month", () => {
    const now = new Date("2026-08-13T23:59:59.000Z");
    expect(currentAllowancePeriodStart(now).toISOString()).toBe(
      "2026-08-01T00:00:00.000Z",
    );
  });

  it("resets on the first of the following UTC month", () => {
    const now = new Date("2026-08-13T23:59:59.000Z");
    expect(nextAllowanceReset(now).toISOString()).toBe(
      "2026-09-01T00:00:00.000Z",
    );
  });

  it("rolls over the year at a December period start", () => {
    const now = new Date("2026-12-20T00:00:00.000Z");
    expect(nextAllowanceReset(now).toISOString()).toBe(
      "2027-01-01T00:00:00.000Z",
    );
  });
});

describe("allowanceExceededMessage", () => {
  it("includes an upgrade hint only for the free plan", () => {
    const details = {
      plan: "free" as const,
      limit: 30,
      used: 30,
      resetsAt: new Date("2026-09-01T00:00:00.000Z"),
    };
    expect(allowanceExceededMessage(details)).toContain("Upgrade to Thido Pro");
    expect(
      allowanceExceededMessage({ ...details, plan: "pro" }),
    ).not.toContain("Upgrade to Thido Pro");
  });
});

describe("checkAndConsumeAiAllowance", () => {
  beforeEach(() => {
    mocks.findUniqueOrThrow.mockReset();
    mocks.update.mockReset();
  });

  it("allows and records usage within the free monthly limit", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: 5,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });
    mocks.update.mockResolvedValue({});

    const result = await checkAndConsumeAiAllowance(
      "user-1",
      "DOCUMENT_GENERATE",
      "claude-sonnet-5",
    );

    expect(result).toEqual({
      plan: "free",
      limit: MONTHLY_AI_ALLOWANCE.free,
      used: 10,
      remaining: MONTHLY_AI_ALLOWANCE.free - 10,
    });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ aiCreditsUsed: 10 }),
      }),
    );
  });

  it("throws once the free plan's monthly allowance would be exceeded", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: MONTHLY_AI_ALLOWANCE.free,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });

    await expect(
      checkAndConsumeAiAllowance("user-1", "DOCUMENT_FOLLOWUPS", "claude-sonnet-5"),
    ).rejects.toBeInstanceOf(AiAllowanceExceededError);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("gives paying users the higher pro allowance", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: "active",
      aiCreditsUsed: MONTHLY_AI_ALLOWANCE.free + 10,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });
    mocks.update.mockResolvedValue({});

    const result = await checkAndConsumeAiAllowance(
      "user-1",
      "DOCUMENT_FOLLOWUPS",
      "claude-sonnet-5",
    );

    expect(result.plan).toBe("pro");
    expect(result.limit).toBe(MONTHLY_AI_ALLOWANCE.pro);
  });

  it("resets usage once a stored period has rolled into a prior month", async () => {
    const lastMonth = new Date(currentAllowancePeriodStart());
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    mocks.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: MONTHLY_AI_ALLOWANCE.free,
      aiCreditsPeriodStart: lastMonth,
    });
    mocks.update.mockResolvedValue({});

    const result = await checkAndConsumeAiAllowance(
      "user-1",
      "DOCUMENT_FOLLOWUPS",
      "claude-sonnet-5",
    );

    expect(result.used).toBe(1);
  });
});

describe("getAiAllowanceStatus", () => {
  beforeEach(() => {
    mocks.findUniqueOrThrow.mockReset();
  });

  it("reports remaining allowance without consuming any credits", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: 12,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });

    const status = await getAiAllowanceStatus("user-1");

    expect(status.used).toBe(12);
    expect(status.remaining).toBe(MONTHLY_AI_ALLOWANCE.free - 12);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
