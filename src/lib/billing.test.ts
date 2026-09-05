import type Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { hasPaidSubscription, subscriptionSnapshot } from "@/lib/billing";

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
