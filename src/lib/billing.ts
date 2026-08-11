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
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
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
