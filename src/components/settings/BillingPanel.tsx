import {
  openBillingPortal,
  startSubscriptionCheckout,
} from "@/app/billing-actions";
import type { BillingOffer } from "@/lib/billing";
import { hasPaidSubscription } from "@/lib/billing";

const BILLING_MESSAGES: Record<string, string> = {
  success: "Your checkout completed. Stripe is confirming your subscription.",
  cancelled: "Checkout was cancelled. Your free beta access is unchanged.",
  unavailable: "Paid checkout is not available yet. Your free beta access is unchanged.",
  "already-subscribed": "You already have a subscription. Use the billing portal to manage it.",
};

export function BillingPanel({
  betaSeat,
  subscriptionStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  offer,
  notice,
}: {
  betaSeat: number;
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  offer: BillingOffer | null;
  notice?: string;
}) {
  const paid = hasPaidSubscription(subscriptionStatus);
  const noticeMessage = notice ? BILLING_MESSAGES[notice] : null;

  return (
    <section className="border-t border-[var(--border-strong)] pt-7" aria-labelledby="billing-heading">
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-start sm:gap-10">
        <div>
          <h2 id="billing-heading" className="font-semibold">
            Plan and billing
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            You’re beta member #{betaSeat}. The first 100 places were automatic;
            later places are approved from the waitlist. No card is required.
          </p>
          {noticeMessage && (
            <p className="mt-3 text-sm text-[var(--foreground)]" role="status">
              {noticeMessage}
            </p>
          )}
        </div>

        <div className="app-panel flex flex-col gap-3 rounded-xl p-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
              Current plan
            </p>
            <p className="mt-1 font-semibold">
              {paid ? "Paid subscription" : "Free beta"}
            </p>
            {subscriptionStatus && (
              <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                Stripe status: {subscriptionStatus.replaceAll("_", " ")}
              </p>
            )}
            {currentPeriodEnd && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {cancelAtPeriodEnd ? "Access ends" : "Renews"}{" "}
                {new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
                  currentPeriodEnd,
                )}
              </p>
            )}
          </div>

          {paid ? (
            <form action={openBillingPortal}>
              <button
                type="submit"
                className="secondary-button w-full rounded-md px-3 py-2.5 text-sm font-semibold"
              >
                Manage billing
              </button>
            </form>
          ) : offer ? (
            <form action={startSubscriptionCheckout}>
              <button
                type="submit"
                className="primary-button w-full rounded-md px-3 py-2.5 text-sm font-semibold"
              >
                Choose {offer.label}/{offer.interval}
              </button>
            </form>
          ) : (
            <p className="text-xs leading-5 text-[var(--muted)]">
              Paid plans are being prepared. Your beta place remains free.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
