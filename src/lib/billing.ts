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
