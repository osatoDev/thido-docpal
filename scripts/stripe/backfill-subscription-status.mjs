/**
 * Re-syncs every user's billing columns (`stripeSubscriptionStatus`,
 * `stripeCurrentPeriodEnd`, `stripeCancelAtPeriodEnd`, `stripePriceId`,
 * `stripeCustomerId`) directly from Stripe, bypassing the webhook path.
 *
 * Why this exists: `subscriptionSnapshot()` in `src/lib/billing.ts` used to
 * derive `cancelAtPeriodEnd` only from Stripe's `cancel_at_period_end`
 * boolean, missing subscriptions scheduled to cancel via the general-purpose
 * `cancel_at` timestamp instead (the Dashboard's "Cancel subscription" flow
 * does this). Any such cancellation already delivered and processed before
 * that fix shipped is stuck with a stale `false` in the database — the code
 * fix only changes how *future* webhook deliveries compute the value, it
 * does not touch rows already written. Resending the same Stripe event from
 * the Dashboard will not help either: `StripeWebhookEvent` keys on Stripe's
 * event id for idempotency, so a resend of the identical event is treated as
 * an already-processed duplicate and skipped without reapplying anything.
 * This script re-derives the correct values straight from Stripe's current
 * subscription state instead of depending on any specific historical event.
 *
 * Safe to re-run; dry-run by default.
 *
 * Usage:
 *   node --env-file=.env scripts/stripe/backfill-subscription-status.mjs
 *   THIDO_APPLY=1 node --env-file=.env scripts/stripe/backfill-subscription-status.mjs
 *
 * Options (env vars):
 *   THIDO_APPLY        set to "1" to write changes; otherwise this only prints
 *                      what would change.
 *   THIDO_ALLOW_LIVE   set to "1" to permit a live Stripe key (refused
 *                      otherwise, matching the other scripts in this folder).
 */
import { PrismaClient } from "@prisma/client";
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error("STRIPE_SECRET_KEY is not set.");
  process.exit(1);
}
if (/(^sk_live_|^rk_live_)/.test(secretKey) && process.env.THIDO_ALLOW_LIVE !== "1") {
  console.error("Refusing to run against a LIVE Stripe key. Set THIDO_ALLOW_LIVE=1 to override.");
  process.exit(1);
}

const apply = process.env.THIDO_APPLY === "1";
const stripe = new Stripe(secretKey);
const prisma = new PrismaClient();

function stripeObjectId(value) {
  return typeof value === "string" ? value : (value?.id ?? null);
}

// Mirrors the fixed logic in src/lib/billing.ts: `cancel_at_period_end` alone
// misses cancellations scheduled via the general-purpose `cancel_at` field.
function snapshot(subscription) {
  const item = subscription.items.data[0];
  return {
    stripeCustomerId: stripeObjectId(subscription.customer),
    stripeSubscriptionId: subscription.id,
    stripePriceId: item?.price.id ?? null,
    stripeSubscriptionStatus: subscription.status,
    stripeCurrentPeriodEnd: item?.current_period_end
      ? new Date(item.current_period_end * 1000)
      : null,
    stripeCancelAtPeriodEnd:
      subscription.cancel_at_period_end || subscription.cancel_at !== null,
  };
}

function diff(current, next) {
  const changed = {};
  for (const key of Object.keys(next)) {
    const before = current[key];
    const after = next[key];
    const same =
      before instanceof Date && after instanceof Date
        ? before.getTime() === after.getTime()
        : before === after;
    if (!same) changed[key] = { before, after };
  }
  return changed;
}

async function main() {
  const users = await prisma.user.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: {
      id: true,
      email: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeSubscriptionStatus: true,
      stripeCurrentPeriodEnd: true,
      stripeCancelAtPeriodEnd: true,
    },
  });

  console.log(`Checking ${users.length} user(s) with a Stripe subscription id.`);
  let changedCount = 0;

  for (const user of users) {
    let subscription;
    try {
      subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    } catch (error) {
      console.error(`  ${user.email ?? user.id}: failed to fetch ${user.stripeSubscriptionId}`, error.message);
      continue;
    }

    const next = snapshot(subscription);
    const changed = diff(user, next);
    if (Object.keys(changed).length === 0) continue;

    changedCount += 1;
    console.log(`${user.email ?? user.id} (${user.id}):`);
    for (const [key, { before, after }] of Object.entries(changed)) {
      console.log(`  ${key}: ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
    }

    if (apply) {
      await prisma.user.update({ where: { id: user.id }, data: next });
      console.log("  applied.");
    }
  }

  console.log(
    changedCount === 0
      ? "No mismatches found."
      : `${changedCount} user(s) had mismatched billing columns.${apply ? " Applied." : " Re-run with THIDO_APPLY=1 to write these changes."}`,
  );

  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
