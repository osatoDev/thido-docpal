import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const transaction = {
    $queryRaw: vi.fn(),
    user: { findUnique: vi.fn(), update: vi.fn() },
    document: { create: vi.fn() },
  };
  return {
    transaction,
    prisma: {
      user: { findUnique: vi.fn() },
      $transaction: vi.fn((run: (tx: typeof transaction) => unknown) => run(transaction)),
    },
  };
});

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));

import { getOrCreatePlan, PLAN_TITLE } from "@/lib/plan";

describe("getOrCreatePlan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.document.create.mockResolvedValue({ id: "plan-1" });
  });

  it("returns the existing plan without a transaction", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ planDocumentId: "plan-9" });

    await expect(getOrCreatePlan("user-1")).resolves.toEqual({ id: "plan-9" });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates the plan and links it to the person on first use", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ planDocumentId: null });
    mocks.transaction.user.findUnique.mockResolvedValue({ planDocumentId: null });

    await expect(getOrCreatePlan("user-1")).resolves.toEqual({ id: "plan-1" });
    expect(mocks.transaction.$queryRaw).toHaveBeenCalled();
    expect(mocks.transaction.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ ownerId: "user-1", title: PLAN_TITLE }),
      }),
    );
    expect(mocks.transaction.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { planDocumentId: "plan-1" },
    });
  });

  it("uses a plan created by a concurrent first visit", async () => {
    mocks.prisma.user.findUnique.mockResolvedValue({ planDocumentId: null });
    mocks.transaction.user.findUnique.mockResolvedValue({ planDocumentId: "plan-2" });

    await expect(getOrCreatePlan("user-1")).resolves.toEqual({ id: "plan-2" });
    expect(mocks.transaction.document.create).not.toHaveBeenCalled();
  });
});
