"use server";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { hasPaidSubscription } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";
import { getAppUrl, getStripe } from "@/lib/stripe";

async function authenticatedBillingUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login?notice=sign-in-required&callbackUrl=/billing");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      betaSeat: true,
      stripeCustomerId: true,
      stripeSubscriptionStatus: true,
    },
  });
  if (!user || user.betaSeat === null) {
    redirect("/login?notice=session-expired");
  }
  return user;
}

async function stripeCustomerId() {
  const user = await authenticatedBillingUser();
  if (user.stripeCustomerId) return { user, customerId: user.stripeCustomerId };

  try {
    const customer = await getStripe().customers.create(
      {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
        metadata: { thidoUserId: user.id },
      },
      { idempotencyKey: `thido-customer-${user.id}` },
    );
    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customer.id },
    });
    return { user, customerId: customer.id };
  } catch (error) {
    console.error("Unable to create Stripe customer", { userId: user.id });
    await reportServerError(error, {
      source: "stripe-billing",
      operation: "create-customer",
    });
    return null;
  }
}

export async function startSubscriptionCheckout() {
  const priceId = process.env.STRIPE_PRO_PRICE_ID?.trim();
  if (!priceId) redirect("/billing?billing=unavailable");

  const billingUser = await stripeCustomerId();
  if (!billingUser) redirect("/billing?billing=unavailable");
  const { user, customerId } = billingUser;
  if (hasPaidSubscription(user.stripeSubscriptionStatus)) {
    redirect("/billing?billing=already-subscribed");
  }

  const appUrl = getAppUrl();
  let checkout;
  try {
    checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: user.id,
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      metadata: { thidoUserId: user.id },
      subscription_data: {
        metadata: { thidoUserId: user.id },
      },
      success_url: `${appUrl}/billing?billing=success`,
      cancel_url: `${appUrl}/billing?billing=cancelled`,
    });
  } catch (error) {
    console.error("Unable to create Stripe Checkout session", {
      userId: user.id,
    });
    await reportServerError(error, {
      source: "stripe-billing",
      operation: "create-checkout",
    });
    redirect("/billing?billing=unavailable");
  }

  if (!checkout.url) redirect("/billing?billing=unavailable");
  redirect(checkout.url);
}

export async function openBillingPortal() {
  const billingUser = await stripeCustomerId();
  if (!billingUser) redirect("/billing?billing=unavailable");

  let portal;
  try {
    portal = await getStripe().billingPortal.sessions.create({
      customer: billingUser.customerId,
      return_url: `${getAppUrl()}/billing`,
    });
  } catch (error) {
    console.error("Unable to create Stripe billing portal session", {
      userId: billingUser.user.id,
    });
    await reportServerError(error, {
      source: "stripe-billing",
      operation: "create-portal",
    });
    redirect("/billing?billing=unavailable");
  }
  redirect(portal.url);
}
