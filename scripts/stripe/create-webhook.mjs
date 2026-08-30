/**
 * Creates (or reuses) the Stripe webhook endpoint that feeds
 * `/api/webhooks/stripe`, subscribed to exactly the events the route handles.
 *
 * Usage:
 *   THIDO_WEBHOOK_URL=https://thido.ai/api/webhooks/stripe \
 *     node --env-file=.env scripts/stripe/create-webhook.mjs
 *
 * If THIDO_WEBHOOK_URL is unset it defaults to
 * https://thido.ai/api/webhooks/stripe.
 *
 * The signing secret is only returned by Stripe at creation time. If an
 * endpoint for the URL already exists this script prints its id but cannot
 * recover the secret — pass THIDO_RECREATE=1 to delete and recreate it (this
 * invalidates the old secret).
 *
 * After running, put the printed `whsec_...` into STRIPE_WEBHOOK_SECRET in the
 * environment that serves the target URL (for https://thido.ai that is Vercel
 * Production) and redeploy. Until then the route returns 503 and Stripe will
 * show failed deliveries.
 */
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

const url =
  process.env.THIDO_WEBHOOK_URL?.trim() ||
  "https://thido.ai/api/webhooks/stripe";
const recreate = process.env.THIDO_RECREATE === "1";

// Match the API version the installed `stripe` package pins, so event payloads
// (e.g. subscription item `current_period_end`) line up with the webhook route.
// Update when bumping the stripe dependency.
const API_VERSION = "2026-07-29.dahlia";

const ENABLED_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const stripe = new Stripe(secretKey);

async function main() {
  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find(
    (endpoint) => endpoint.url === url,
  );

  if (existing && !recreate) {
    console.log(`An endpoint for this URL already exists: ${existing.id}`);
    console.log(`  status:  ${existing.status}`);
    console.log(`  events:  ${existing.enabled_events.join(", ")}`);
    console.log("");
    console.log(
      "Stripe does not return the signing secret after creation. To get a fresh\n" +
        "secret, re-run with THIDO_RECREATE=1 (this invalidates the current one),\n" +
        "or roll the secret in the Dashboard.",
    );
    return;
  }

  if (existing && recreate) {
    await stripe.webhookEndpoints.del(existing.id);
    console.log(`Deleted existing endpoint ${existing.id}`);
  }

  const endpoint = await stripe.webhookEndpoints.create({
    url,
    enabled_events: ENABLED_EVENTS,
    api_version: API_VERSION,
    description: "Thido /api/webhooks/stripe",
  });

  console.log(`Created webhook endpoint ${endpoint.id}`);
  console.log(`  url:     ${endpoint.url}`);
  console.log(`  events:  ${endpoint.enabled_events.join(", ")}`);
  console.log(`  api:     ${endpoint.api_version}`);
  console.log("");
  console.log(`STRIPE_WEBHOOK_SECRET=${endpoint.secret}`);
  console.log(
    "^ set this in the environment that serves the URL above, then redeploy.",
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
