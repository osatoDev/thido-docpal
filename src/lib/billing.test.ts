import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import {
  decideSubscriptionLifecycleEmail,
  hasPaidSubscription,
  subscriptionSnapshot,
  wasRecentlyDowngraded,
} from "@/lib/billing";

function stripeSubscription(
  overrides: Partial<Stripe.Subscription>,
): Stripe.Subscription {
  return {
    id: "sub_1",
    customer: "cus_1",
    status: "active",
    cancel_at_period_end: false,
    cancel_at: null,
    items: {
      data: [
        {
          current_period_end: 1791233227,
          price: { id: "price_1" },
        },
      ],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("subscriptionSnapshot", () => {
  it("reports cancelAtPeriodEnd when Stripe sets the boolean flag", () => {
    const snapshot = subscriptionSnapshot(
      stripeSubscription({ cancel_at_period_end: true }),
    );
    expect(snapshot.cancelAtPeriodEnd).toBe(true);
  });

  it("also reports cancelAtPeriodEnd when Stripe instead schedules a `cancel_at` timestamp", () => {
    // Real payload observed from a Dashboard-initiated cancellation:
    // `cancel_at_period_end` stays false, but `cancel_at` is set (here, to
    // the same instant as the item's `current_period_end`). Reading only the
    // boolean flag would miss this subscription's scheduled cancellation.
    const snapshot = subscriptionSnapshot(
      stripeSubscription({
        cancel_at_period_end: false,
        cancel_at: 1791233227,
        canceled_at: 1788641280,
        status: "active",
      }),
    );
    expect(snapshot.cancelAtPeriodEnd).toBe(true);
    expect(snapshot.status).toBe("active");
  });

  it("reports no pending cancellation for a plain active subscription", () => {
    const snapshot = subscriptionSnapshot(stripeSubscription({}));
    expect(snapshot.cancelAtPeriodEnd).toBe(false);
  });
});

describe("hasPaidSubscription", () => {
  it("treats active, trialing, and past_due as paid", () => {
    expect(hasPaidSubscription("active")).toBe(true);
    expect(hasPaidSubscription("trialing")).toBe(true);
    expect(hasPaidSubscription("past_due")).toBe(true);
  });

  it("treats canceled and null as not paid", () => {
    expect(hasPaidSubscription("canceled")).toBe(false);
    expect(hasPaidSubscription(null)).toBe(false);
  });
});

describe("decideSubscriptionLifecycleEmail", () => {
  const accessEndsAt = new Date("2026-10-05T00:00:00Z");

  it("fires 'cancel-scheduled' when cancelAtPeriodEnd newly turns on while still active", () => {
    const result = decideSubscriptionLifecycleEmail({
      before: { cancelAtPeriodEnd: false, status: "active" },
      after: { cancelAtPeriodEnd: true, status: "active", currentPeriodEnd: accessEndsAt },
    });
    expect(result).toEqual({ kind: "cancel-scheduled", accessEndsAt });
  });

  it("does not re-fire 'cancel-scheduled' on a later update that changes nothing relevant", () => {
    // e.g. the customer filling in the cancellation-feedback survey after
    // already canceling: cancelAtPeriodEnd was already true before this event.
    const result = decideSubscriptionLifecycleEmail({
      before: { cancelAtPeriodEnd: true, status: "active" },
      after: { cancelAtPeriodEnd: true, status: "active", currentPeriodEnd: accessEndsAt },
    });
    expect(result).toBeNull();
  });

  it("fires 'ended' when status transitions into canceled", () => {
    const result = decideSubscriptionLifecycleEmail({
      before: { cancelAtPeriodEnd: true, status: "active" },
      after: { cancelAtPeriodEnd: true, status: "canceled", currentPeriodEnd: accessEndsAt },
    });
    expect(result).toEqual({ kind: "ended" });
  });

  it("fires only 'ended', not both, for an immediate cancellation with no prior scheduling", () => {
    const result = decideSubscriptionLifecycleEmail({
      before: { cancelAtPeriodEnd: false, status: "active" },
      after: { cancelAtPeriodEnd: true, status: "canceled", currentPeriodEnd: accessEndsAt },
    });
    expect(result).toEqual({ kind: "ended" });
  });

  it("does not fire on a fresh subscription becoming active", () => {
    const result = decideSubscriptionLifecycleEmail({
      before: { cancelAtPeriodEnd: false, status: null },
      after: { cancelAtPeriodEnd: false, status: "active", currentPeriodEnd: accessEndsAt },
    });
    expect(result).toBeNull();
  });

  it("does not fire on resubscribing after a prior cancellation", () => {
    const result = decideSubscriptionLifecycleEmail({
      before: { cancelAtPeriodEnd: true, status: "canceled" },
      after: { cancelAtPeriodEnd: false, status: "active", currentPeriodEnd: accessEndsAt },
    });
    expect(result).toBeNull();
  });
});

describe("wasRecentlyDowngraded", () => {
  const now = new Date("2026-09-10T00:00:00Z");

  it("is true shortly after a canceled subscription's period end has passed", () => {
    expect(
      wasRecentlyDowngraded({
        paid: false,
        subscriptionStatus: "canceled",
        currentPeriodEnd: new Date("2026-09-05T00:00:00Z"),
        now,
      }),
    ).toBe(true);
  });

  it("is false once the window has elapsed", () => {
    expect(
      wasRecentlyDowngraded({
        paid: false,
        subscriptionStatus: "canceled",
        currentPeriodEnd: new Date("2026-08-01T00:00:00Z"),
        now,
      }),
    ).toBe(false);
  });

  it("is false while still paid, even if cancelAtPeriodEnd-style fields would otherwise qualify", () => {
    expect(
      wasRecentlyDowngraded({
        paid: true,
        subscriptionStatus: "active",
        currentPeriodEnd: new Date("2026-09-05T00:00:00Z"),
        now,
      }),
    ).toBe(false);
  });

  it("is false for a user who never subscribed", () => {
    expect(
      wasRecentlyDowngraded({
        paid: false,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        now,
      }),
    ).toBe(false);
  });
});
