import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { subscriptionSnapshot } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function checkoutReference(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

async function applyStripeEvent(
  transaction: Prisma.TransactionClient,
  event: Stripe.Event,
) {
  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object;
    const userId =
      checkout.client_reference_id ?? checkout.metadata?.thidoUserId;
    if (!userId) return;

    await transaction.user.updateMany({
      where: { id: userId },
      data: {
        stripeCustomerId: checkoutReference(checkout.customer),
        stripeSubscriptionId: checkoutReference(checkout.subscription),
      },
    });
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    const snapshot = subscriptionSnapshot(subscription);
    const userId = subscription.metadata.thidoUserId;
    const userWhere: Prisma.UserWhereInput = userId
      ? { id: userId }
      : snapshot.customerId
        ? { stripeCustomerId: snapshot.customerId }
        : { id: "__no_matching_user__" };

    await transaction.user.updateMany({
      where: userWhere,
      data: {
        stripeCustomerId: snapshot.customerId,
        stripeSubscriptionId: snapshot.subscriptionId,
        stripePriceId: snapshot.priceId,
        stripeSubscriptionStatus: snapshot.status,
        stripeCurrentPeriodEnd: snapshot.currentPeriodEnd,
        stripeCancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      },
    });
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  const signature = request.headers.get("stripe-signature");
  if (!webhookSecret || !signature) {
    return Response.json(
      { error: "Stripe webhook is not configured." },
      { status: 503 },
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret,
    );
  } catch (error) {
    await reportServerError(error, {
      source: "stripe-webhook",
      operation: "invalid-signature",
      status: 400,
    });
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.stripeWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          processedAt: new Date(),
        },
      });
      await applyStripeEvent(transaction, event);
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const processedEvent = await prisma.stripeWebhookEvent.findUnique({
        where: { id: event.id },
        select: { id: true },
      });
      if (processedEvent) {
        return Response.json({ received: true, duplicate: true });
      }
    }
    console.error("Stripe webhook processing failed", {
      eventId: event.id,
      eventType: event.type,
    });
    await reportServerError(error, {
      source: "stripe-webhook",
      eventId: event.id,
      eventType: event.type,
    });
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}
