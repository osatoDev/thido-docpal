import { Prisma } from "@prisma/client";
import type Stripe from "stripe";

import { decideSubscriptionLifecycleEmail, subscriptionSnapshot } from "@/lib/billing";
import {
  sendSubscriptionCancelScheduledEmail,
  sendSubscriptionEndedEmail,
} from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { reportServerError } from "@/lib/rollbar/server";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

function checkoutReference(value: string | { id: string } | null) {
  return typeof value === "string" ? value : value?.id ?? null;
}

type UnmatchedWebhookUser = {
  eventId: string;
  eventType: Stripe.Event["type"];
  userId: string | null;
  customerId: string | null;
};

type PendingSubscriptionEmail =
  | { kind: "cancel-scheduled"; to: string; subscriptionId: string; accessEndsAt: Date }
  | { kind: "ended"; to: string; subscriptionId: string };

type ApplyResult = {
  unmatched: UnmatchedWebhookUser | null;
  pendingEmail: PendingSubscriptionEmail | null;
};

const NO_EFFECT: ApplyResult = { unmatched: null, pendingEmail: null };

/**
 * `updateMany` never throws when its `where` matches zero rows: it just
 * returns `{ count: 0 }`, so a stale/mismatched `thidoUserId` metadata or
 * `stripeCustomerId` would otherwise silently no-op. Stripe sees a 200 and
 * marks the event delivered, while the `User` row never changes. Surfacing
 * that as a return value lets the caller report it once, outside the
 * transaction, instead of the write disappearing without a trace.
 */
async function applyStripeEvent(
  transaction: Prisma.TransactionClient,
  event: Stripe.Event,
): Promise<ApplyResult> {
  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object;
    const userId =
      checkout.client_reference_id ?? checkout.metadata?.thidoUserId ?? null;
    if (!userId) return NO_EFFECT;

    const { count } = await transaction.user.updateMany({
      where: { id: userId },
      data: {
        stripeCustomerId: checkoutReference(checkout.customer),
        stripeSubscriptionId: checkoutReference(checkout.subscription),
      },
    });
    return {
      unmatched:
        count === 0
          ? {
              eventId: event.id,
              eventType: event.type,
              userId,
              customerId: checkoutReference(checkout.customer),
            }
          : null,
      pendingEmail: null,
    };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const subscription = event.data.object;
    const snapshot = subscriptionSnapshot(subscription);
    const userId = subscription.metadata.thidoUserId ?? null;
    const userWhere: Prisma.UserWhereInput = userId
      ? { id: userId }
      : snapshot.customerId
        ? { stripeCustomerId: snapshot.customerId }
        : { id: "__no_matching_user__" };

    // Read the row's prior billing state before overwriting it: deciding
    // whether a "your subscription is set to cancel" or "your plan ended"
    // email is due requires comparing before vs. after, not just the new
    // Stripe payload (see `decideSubscriptionLifecycleEmail`).
    const existing = await transaction.user.findFirst({
      where: userWhere,
      select: {
        id: true,
        email: true,
        stripeCancelAtPeriodEnd: true,
        stripeSubscriptionStatus: true,
      },
    });
    if (!existing) {
      return {
        unmatched: {
          eventId: event.id,
          eventType: event.type,
          userId,
          customerId: snapshot.customerId,
        },
        pendingEmail: null,
      };
    }

    await transaction.user.update({
      where: { id: existing.id },
      data: {
        stripeCustomerId: snapshot.customerId,
        stripeSubscriptionId: snapshot.subscriptionId,
        stripePriceId: snapshot.priceId,
        stripeSubscriptionStatus: snapshot.status,
        stripeCurrentPeriodEnd: snapshot.currentPeriodEnd,
        stripeCancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
      },
    });

    const lifecycleEmail = existing.email
      ? decideSubscriptionLifecycleEmail({
          before: {
            cancelAtPeriodEnd: existing.stripeCancelAtPeriodEnd,
            status: existing.stripeSubscriptionStatus,
          },
          after: {
            cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd,
            status: snapshot.status,
            currentPeriodEnd: snapshot.currentPeriodEnd,
          },
        })
      : null;

    const pendingEmail: PendingSubscriptionEmail | null =
      lifecycleEmail === null || !existing.email
        ? null
        : lifecycleEmail.kind === "ended"
          ? { kind: "ended", to: existing.email, subscriptionId: snapshot.subscriptionId ?? subscription.id }
          : {
              kind: "cancel-scheduled",
              to: existing.email,
              subscriptionId: snapshot.subscriptionId ?? subscription.id,
              accessEndsAt: lifecycleEmail.accessEndsAt,
            };

    return { unmatched: null, pendingEmail };
  }

  return NO_EFFECT;
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

  let result: ApplyResult;
  try {
    result = await prisma.$transaction(async (transaction) => {
      await transaction.stripeWebhookEvent.create({
        data: {
          id: event.id,
          type: event.type,
          processedAt: new Date(),
        },
      });
      return applyStripeEvent(transaction, event);
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

  if (result.unmatched) {
    console.error(
      "Stripe webhook matched no user; no columns were updated",
      result.unmatched,
    );
    await reportServerError(new Error("Stripe webhook matched no user"), {
      source: "stripe-webhook",
      operation: "no-matching-user",
      eventId: result.unmatched.eventId,
      eventType: result.unmatched.eventType,
      userId: result.unmatched.userId,
      customerId: result.unmatched.customerId,
    });
  }

  if (result.pendingEmail) {
    const pendingEmail = result.pendingEmail;
    try {
      if (pendingEmail.kind === "cancel-scheduled") {
        await sendSubscriptionCancelScheduledEmail({
          email: pendingEmail.to,
          subscriptionId: pendingEmail.subscriptionId,
          accessEndsAt: pendingEmail.accessEndsAt,
        });
      } else {
        await sendSubscriptionEndedEmail({
          email: pendingEmail.to,
          subscriptionId: pendingEmail.subscriptionId,
        });
      }
    } catch (error) {
      // The database write already committed; failing the whole webhook
      // response over an email would just make Stripe retry it, and that
      // retry would be treated as a duplicate and skipped (see the P2002
      // handling above) without ever reattempting the email. So this is
      // reported, not thrown.
      console.error("Failed to send a subscription lifecycle email", {
        eventId: event.id,
        kind: pendingEmail.kind,
      });
      await reportServerError(error, {
        source: "stripe-webhook",
        operation: "subscription-lifecycle-email",
        eventId: event.id,
        eventType: event.type,
      });
    }
  }

  return Response.json({ received: true });
}
