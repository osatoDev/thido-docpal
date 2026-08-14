# Can Vercel and Stripe use different email addresses?

Yes. You can keep the existing Vercel account and claim or connect Stripe with
a Stripe login that uses a different email address. The Vercel and Stripe
logins are separate identities; the integration is tied to the selected Vercel
project/resource and Stripe account, not to matching login emails.

For Thido, the Vercel account currently uses `osatog1@gmail.com`. The connected
`stripe-cobalt-harbor` resource is still an unclaimed sandbox, and its Vercel
metadata does not identify a separate Stripe login email. Vercel's Stripe
Marketplace page says an unclaimed sandbox can be claimed by creating a new
Stripe account or by bringing the sandbox work into an existing Stripe account.
That means the intended Stripe owner can use their own Stripe login during the
claim flow, even when its email differs from the Vercel login.

Use this sequence:

1. Stay signed in to the existing Vercel account and open the
   `stripe-cobalt-harbor` resource.
2. Start **Claim sandbox**.
3. In Stripe's part of the flow, sign in with—or create—the Stripe account that
   should legally own Thido's payments.
4. Before confirming, check the Stripe account name, business/legal entity,
   country, and owner email. The email does not have to match Vercel's.
5. Keep the integration in sandbox mode until Stripe activation, product and
   price setup, webhook configuration, and sandbox billing tests are complete.
6. After claiming, verify that the Stripe resource remains connected to the
   intended Vercel project environments before enabling paid checkout.

If both email identities need Stripe access, invite the other address as an
individual Stripe team member instead of sharing a password. Stripe supports
inviting team members by email and assigning roles independently.

Official references:

- [Vercel Stripe Marketplace integration](https://vercel.com/marketplace/stripe/stripe)
- [Vercel: Stripe production accounts, sandbox, and live modes](https://vercel.com/changelog/stripe-is-now-generally-available-on-the-marketplace-and-v0)
- [Stripe: invite and manage team members](https://docs.stripe.com/get-started/account/teams)
- [Stripe: change the email address associated with a Stripe login](https://support.stripe.com/questions/change-the-email-address-associated-with-a-stripe-account?locale=en-GB)
