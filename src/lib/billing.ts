import "server-only";

import type Stripe from "stripe";

import { getStripe, isStripeConfigured } from "@/lib/stripe";

const PAID_SUBSCRIPTION_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export type BillingOffer = {
  priceId: string;
  label: string;
  interval: string;
};

export function hasPaidSubscription(status: string | null) {
  return !!status && PAID_SUBSCRIPTION_STATUSES.has(status);
}

export function stripeObjectId(
  value: string | { id: string } | null,
) {
  return typeof value === "string" ? value : value?.id ?? null;
}

export function subscriptionSnapshot(subscription: Stripe.Subscription) {
  const item = subscription.items.data[0];
  return {
    customerId: stripeObjectId(subscription.customer),
    subscriptionId: subscription.id,
    priceId: item?.price.id ?? null,
    status: subscription.status,
    currentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
    // `cancel_at_period_end` only covers the case where a cancellation was
    // scheduled *as* "cancel at period end." Canceling from the Stripe
    // Dashboard (and some API-driven cancellations) instead schedules it via
    // the general-purpose `cancel_at` timestamp, leaving `cancel_at_period_end`
    // `false` even though the subscription is genuinely scheduled to end.
    // `cancel_at` is non-null in both cases, so it is the reliable signal.
    cancelAtPeriodEnd:
      subscription.cancel_at_period_end || subscription.cancel_at !== null,
  };
}

export type SubscriptionLifecycleEmail =
  | { kind: "cancel-scheduled"; accessEndsAt: Date }
  | { kind: "ended" };

/**
 * Decides whether a subscription webhook just crossed one of the two
 * cancellation moments worth emailing about, by comparing the `User` row's
 * billing columns from before this write to the freshly computed snapshot.
 * Pure and side-effect free so the transition logic (easy to get subtly
 * wrong: an immediate cancellation should only fire "ended," not both) can
 * be unit tested without mocking Prisma or Resend.
 */
export function decideSubscriptionLifecycleEmail({
  before,
  after,
}: {
  before: { cancelAtPeriodEnd: boolean; status: string | null };
  after: {
    cancelAtPeriodEnd: boolean;
    status: string;
    currentPeriodEnd: Date | null;
  };
}): SubscriptionLifecycleEmail | null {
  const justEnded = before.status !== "canceled" && after.status === "canceled";
  if (justEnded) return { kind: "ended" };

  const justScheduledCancel =
    !before.cancelAtPeriodEnd &&
    after.cancelAtPeriodEnd &&
    after.status !== "canceled";
  if (justScheduledCancel && after.currentPeriodEnd) {
    return { kind: "cancel-scheduled", accessEndsAt: after.currentPeriodEnd };
  }

  return null;
}

const DOWNGRADE_NOTICE_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * Whether the billing page should tell the user their Pro plan just ended.
 * There's no dedicated "seen it" flag, so this is a time window rather than
 * a true one-time notice: true for two weeks after `currentPeriodEnd` has
 * passed on a now-canceled subscription, then quietly stops rather than
 * lingering forever. Takes `now` as a parameter (defaulting to the real
 * clock) instead of calling `Date.now()` itself so it stays a plain,
 * unit-testable function; `BillingPanel` calls this rather than reading the
 * clock directly, since React's purity rule for component render forbids
 * calling `Date.now()`/`new Date()` inline in a component body.
 */
export function wasRecentlyDowngraded({
  paid,
  subscriptionStatus,
  currentPeriodEnd,
  now = new Date(),
}: {
  paid: boolean;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  now?: Date;
}): boolean {
  if (paid || subscriptionStatus !== "canceled" || !currentPeriodEnd) {
    return false;
  }
  const sinceEnded = now.getTime() - currentPeriodEnd.getTime();
  return sinceEnded >= 0 && sinceEnded < DOWNGRADE_NOTICE_WINDOW_MS;
}

export async function getBillingOffer(): Promise<BillingOffer | null> {
  const priceId = process.env.STRIPE_PRO_PRICE_ID?.trim();
  if (!priceId || !isStripeConfigured()) return null;

  try {
    const price = await getStripe().prices.retrieve(priceId, {
      expand: ["product"],
    });
    if (!price.active || price.unit_amount === null || !price.recurring) {
      return null;
    }

    const product = price.product;
    const productName =
      typeof product === "object" && !product.deleted
        ? product.name
        : "Thido paid plan";
    const amount = new Intl.NumberFormat("en", {
      style: "currency",
      currency: price.currency.toUpperCase(),
    }).format(price.unit_amount / 100);

    return {
      priceId,
      label: `${productName}: ${amount}`,
      interval: price.recurring.interval,
    };
  } catch (error) {
    console.error("Unable to load the configured Stripe price", error);
    return null;
  }
}
