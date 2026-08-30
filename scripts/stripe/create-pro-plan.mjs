/**
 * Creates (or reuses) the "Thido Pro" product and a recurring Price in Stripe,
 * so the catalogue does not have to be built by hand in the Dashboard.
 *
 * Safe to re-run: it looks the product up by its fixed id and the price up by
 * its lookup_key, and only creates what is missing.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_... node scripts/stripe/create-pro-plan.mjs
 *   node --env-file=.env scripts/stripe/create-pro-plan.mjs
 *
 * Options (env vars):
 *   THIDO_PRICE_AMOUNT   integer minor units, default 1200 (= €12.00)
 *   THIDO_PRICE_CURRENCY ISO code, default "eur"
 *   THIDO_PRICE_INTERVAL "month" (default) or "year"
 *   THIDO_TAX_CODE       Stripe tax code, default txcd_10000000
 *                        (General - Electronically Supplied Services, the
 *                        preset the Dashboard picks for this product)
 *   THIDO_ALLOW_LIVE     set to "1" to permit a live key (refused otherwise)
 *
 * It prints the resulting price id. Put that in STRIPE_PRO_PRICE_ID for the
 * environments where sandbox Checkout should be visible. Replace it with the
 * live Price id when the Stripe account is activated.
 */
import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;
if (!secretKey) {
  console.error(
    "STRIPE_SECRET_KEY is not set. Copy the sandbox secret key from the Stripe\n" +
      "Dashboard (Developers -> API keys) or run `vercel env pull`.",
  );
  process.exit(1);
}
if (/(^sk_live_|^rk_live_)/.test(secretKey) && process.env.THIDO_ALLOW_LIVE !== "1") {
  console.error(
    "Refusing to run against a LIVE Stripe key. Use the sandbox key, or set\n" +
      "THIDO_ALLOW_LIVE=1 if this is deliberate.",
  );
  process.exit(1);
}

const PRODUCT_ID = "thido_pro";
const PRODUCT_DESCRIPTION =
  "A monthly subscription to Thido's document editor with 300 AI credits each month, for people who want to enhance their writing with AI.";
const amount = Number(process.env.THIDO_PRICE_AMOUNT ?? 1200);
const currency = (process.env.THIDO_PRICE_CURRENCY ?? "eur").toLowerCase();
const interval = process.env.THIDO_PRICE_INTERVAL ?? "month";
const taxCode = process.env.THIDO_TAX_CODE ?? "txcd_10000000";
const lookupKey = `thido_pro_${interval}_${currency}`;

const stripe = new Stripe(secretKey);

async function main() {
  const product = await ensureProduct();
  const price = await ensurePrice(product.id);

  console.log("");
  console.log(`product:   ${product.id} (${product.name})`);
  console.log(`price:     ${price.id}`);
  console.log(`lookup:    ${price.lookup_key}`);
  console.log(
    `amount:    ${(price.unit_amount / 100).toFixed(2)} ${price.currency.toUpperCase()} / ${price.recurring.interval}`,
  );
  console.log("");
  console.log(`STRIPE_PRO_PRICE_ID=${price.id}`);
  console.log("^ set this wherever sandbox Checkout should be visible.");
}

async function ensureProduct() {
  try {
    const existing = await stripe.products.retrieve(PRODUCT_ID);
    if (existing.description !== PRODUCT_DESCRIPTION) {
      const updated = await stripe.products.update(existing.id, {
        description: PRODUCT_DESCRIPTION,
      });
      console.log(`Updated product ${updated.id}`);
      return updated;
    }
    console.log(`Reusing product ${existing.id}`);
    return existing;
  } catch (error) {
    if (error?.code !== "resource_missing") throw error;
  }
  const created = await stripe.products.create({
    id: PRODUCT_ID,
    name: "Thido Pro",
    description: PRODUCT_DESCRIPTION,
    tax_code: taxCode,
    // Only list what is actually enforced/differentiated by plan today.
    marketing_features: [
      { name: "10x the monthly AI allowance of the free plan" },
    ],
  });
  console.log(`Created product ${created.id}`);
  return created;
}

async function ensurePrice(productId) {
  const found = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  if (found.data[0]) {
    console.log(`Reusing price ${found.data[0].id} (lookup_key ${lookupKey})`);
    return found.data[0];
  }
  const created = await stripe.prices.create({
    product: productId,
    currency,
    unit_amount: amount,
    recurring: { interval },
    lookup_key: lookupKey,
    nickname: `Thido Pro ${interval}ly (${currency.toUpperCase()})`,
  });
  console.log(`Created price ${created.id}`);
  return created;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
