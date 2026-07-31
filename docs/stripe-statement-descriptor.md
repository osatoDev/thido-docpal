# Stripe statement descriptor for Thido

## Recommended values

- **Statement descriptor:** `THIDO.AI`
- **Shortened descriptor:** `THIDO`

`THIDO.AI` is the strongest choice because it matches both the Thido brand and
the public website customers use. That makes a charge easier to recognise and
reduces the chance of an avoidable dispute. `THIDO` is a clear shortened prefix
if Stripe later combines it with a product-specific suffix.

If Stripe does not accept the dot for this account, use `THIDO DOCS` as the
full descriptor and keep `THIDO` as the shortened descriptor.

Stripe currently requires a full descriptor to contain 5–22 Latin characters,
include a letter, reflect the business name, and avoid its prohibited special
characters. A shortened descriptor must contain 2–10 characters. See
[Stripe's statement descriptor documentation](https://docs.stripe.com/get-started/account/statement-descriptors?locale=en-GB).

Before accepting live payments, make a sandbox subscription payment and confirm
that the descriptor is understandable in the resulting payment or statement
record. Customer-facing billing copy should also tell subscribers that charges
will appear as **THIDO.AI**.
