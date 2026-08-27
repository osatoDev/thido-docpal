import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const user = {
    findUniqueOrThrow: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const aiCreditCharge = {
    create: vi.fn(),
    groupBy: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const client: Record<string, unknown> = { user, aiCreditCharge };
  client.$transaction = vi.fn((arg: unknown) =>
    typeof arg === "function"
      ? (arg as (tx: unknown) => unknown)(client)
      : Promise.all(arg as Promise<unknown>[]),
  );
  return { user, aiCreditCharge, client };
});

vi.mock("@/lib/prisma", () => ({ prisma: mocks.client }));

import {
  actionCreditWeight,
  AiAllowanceExceededError,
  allowanceExceededMessage,
  checkAndConsumeAiAllowance,
  currentAllowancePeriodStart,
  getAiAllowanceStatus,
  getAiCreditHistory,
  MONTHLY_AI_ALLOWANCE,
  nextAllowanceReset,
  refundAiCreditCharge,
} from "@/lib/entitlements";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.update.mockResolvedValue({});
  mocks.user.findUnique.mockResolvedValue(null);
  mocks.aiCreditCharge.create.mockResolvedValue({ id: "charge-1" });
  mocks.aiCreditCharge.groupBy.mockResolvedValue([]);
  mocks.aiCreditCharge.findMany.mockResolvedValue([]);
  mocks.aiCreditCharge.findUnique.mockResolvedValue(null);
  mocks.aiCreditCharge.update.mockResolvedValue({});
});

describe("AI action credit weights", () => {
  it("weighs a short planning action as one credit on a non-premium model", () => {
    expect(actionCreditWeight("DOCUMENT_FOLLOWUPS", "claude-haiku-4-5")).toBe(1);
  });

  it("weighs whole-document actions higher than short actions", () => {
    expect(actionCreditWeight("DOCUMENT_GENERATE", "claude-sonnet-5")).toBe(5);
    expect(
      actionCreditWeight("COMMENT_RESPOND_DOCUMENT", "claude-sonnet-5"),
    ).toBe(5);
  });

  it("doubles the weight for the premium Opus model", () => {
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
  it("allows and records usage within the free monthly limit", async () => {
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: 5,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });

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
      chargeId: "charge-1",
    });
    expect(mocks.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ aiCreditsUsed: 10 }),
      }),
    );
  });

  it("writes a ledger row for the charge in the same transaction", async () => {
    const periodStart = currentAllowancePeriodStart();
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: 5,
      aiCreditsPeriodStart: periodStart,
    });

    await checkAndConsumeAiAllowance(
      "user-1",
      "COMMENT_RESPOND_DOCUMENT",
      "claude-opus-4-8",
      { documentId: "doc-1" },
    );

    expect(mocks.aiCreditCharge.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-1",
          action: "COMMENT_RESPOND",
          model: "claude-opus-4-8",
          credits: 10,
          plan: "free",
          periodStart,
          balanceAfter: 15,
          documentId: "doc-1",
        }),
      }),
    );
    expect(mocks.client.$transaction).toHaveBeenCalledTimes(1);
  });

  it("throws once the free plan's monthly allowance would be exceeded", async () => {
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: MONTHLY_AI_ALLOWANCE.free,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });

    await expect(
      checkAndConsumeAiAllowance("user-1", "DOCUMENT_FOLLOWUPS", "claude-sonnet-5"),
    ).rejects.toBeInstanceOf(AiAllowanceExceededError);
    expect(mocks.user.update).not.toHaveBeenCalled();
    expect(mocks.aiCreditCharge.create).not.toHaveBeenCalled();
  });

  it("gives paying users the higher pro allowance", async () => {
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: "active",
      aiCreditsUsed: MONTHLY_AI_ALLOWANCE.free + 10,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });

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
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: MONTHLY_AI_ALLOWANCE.free,
      aiCreditsPeriodStart: lastMonth,
    });

    const result = await checkAndConsumeAiAllowance(
      "user-1",
      "DOCUMENT_FOLLOWUPS",
      "claude-sonnet-5",
    );

    expect(result.used).toBe(1);
  });
});

describe("refundAiCreditCharge", () => {
  it("marks the charge refunded and returns the credits for the current period", async () => {
    const periodStart = currentAllowancePeriodStart();
    mocks.aiCreditCharge.findUnique.mockResolvedValue({
      userId: "user-1",
      credits: 5,
      periodStart,
      refundedAt: null,
    });
    mocks.user.findUnique.mockResolvedValue({
      aiCreditsUsed: 12,
      aiCreditsPeriodStart: periodStart,
    });

    await refundAiCreditCharge("charge-1");

    expect(mocks.aiCreditCharge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "charge-1" },
        data: expect.objectContaining({ refundedAt: expect.any(Date) }),
      }),
    );
    expect(mocks.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { aiCreditsUsed: 7 } }),
    );
  });

  it("does nothing when the charge is already refunded", async () => {
    mocks.aiCreditCharge.findUnique.mockResolvedValue({
      userId: "user-1",
      credits: 5,
      periodStart: currentAllowancePeriodStart(),
      refundedAt: new Date(),
    });

    await refundAiCreditCharge("charge-1");

    expect(mocks.client.$transaction).not.toHaveBeenCalled();
  });

  it("does not touch the running counter for a charge from a prior period", async () => {
    const lastMonth = new Date(currentAllowancePeriodStart());
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    mocks.aiCreditCharge.findUnique.mockResolvedValue({
      userId: "user-1",
      credits: 5,
      periodStart: lastMonth,
      refundedAt: null,
    });

    await refundAiCreditCharge("charge-1");

    expect(mocks.aiCreditCharge.update).toHaveBeenCalled();
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
});

describe("getAiAllowanceStatus", () => {
  it("reports remaining allowance and a per-action breakdown without consuming credits", async () => {
    mocks.user.findUniqueOrThrow.mockResolvedValue({
      stripeSubscriptionStatus: null,
      aiCreditsUsed: 12,
      aiCreditsPeriodStart: currentAllowancePeriodStart(),
    });
    mocks.aiCreditCharge.groupBy.mockResolvedValue([
      { action: "DOCUMENT_FOLLOWUPS", _sum: { credits: 2 }, _count: { _all: 2 } },
      { action: "DOCUMENT_GENERATE", _sum: { credits: 10 }, _count: { _all: 2 } },
    ]);

    const status = await getAiAllowanceStatus("user-1");

    expect(status.used).toBe(12);
    expect(status.remaining).toBe(MONTHLY_AI_ALLOWANCE.free - 12);
    expect(status.breakdown).toEqual([
      { action: "DOCUMENT_GENERATE", credits: 10, count: 2 },
      { action: "DOCUMENT_FOLLOWUPS", credits: 2, count: 2 },
    ]);
    expect(mocks.user.update).not.toHaveBeenCalled();
  });
});

describe("getAiCreditHistory", () => {
  it("maps ledger rows and returns a cursor when more remain", async () => {
    const base = {
      action: "DOCUMENT_GENERATE" as const,
      model: "claude-sonnet-5",
      credits: 5,
      refundedAt: null,
      periodStart: currentAllowancePeriodStart(),
      createdAt: new Date("2026-08-20T10:00:00.000Z"),
      document: { id: "doc-1", title: "Q3 plan" },
    };
    mocks.aiCreditCharge.findMany.mockResolvedValue([
      { id: "c1", ...base },
      { id: "c2", ...base, refundedAt: new Date(), document: null },
    ]);

    const result = await getAiCreditHistory("user-1", { limit: 1 });

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      id: "c1",
      action: "DOCUMENT_GENERATE",
      credits: 5,
      refunded: false,
      documentId: "doc-1",
      documentTitle: "Q3 plan",
    });
    expect(result.nextCursor).toBe("c1");
  });

  it("returns no cursor when the page is not full", async () => {
    mocks.aiCreditCharge.findMany.mockResolvedValue([]);

    const result = await getAiCreditHistory("user-1");

    expect(result.entries).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });
});
