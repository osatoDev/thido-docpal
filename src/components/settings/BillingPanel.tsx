import Link from "next/link";
import type { AiFeature } from "@prisma/client";

import {
  openBillingPortal,
  startSubscriptionCheckout,
} from "@/app/billing-actions";
import { aiCreditActionLabel } from "@/lib/aiCreditLabels";
import type { BillingOffer } from "@/lib/billing";
import { hasPaidSubscription, wasRecentlyDowngraded } from "@/lib/billing";
import { MONTHLY_AI_ALLOWANCE } from "@/lib/entitlements";

const BILLING_MESSAGES: Record<string, string> = {
  success: "Your checkout completed. Stripe is confirming your subscription.",
  cancelled: "Checkout was cancelled. Your free beta access is unchanged.",
  unavailable:
    "Paid checkout is not available yet. Your free beta access is unchanged.",
  "already-subscribed":
    "You already have a subscription. Use the billing portal to manage it.",
};

export function BillingPanel({
  subscriptionStatus,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  offer,
  notice,
  aiAllowance,
  layout = "settings",
}: {
  subscriptionStatus: string | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  offer: BillingOffer | null;
  notice?: string;
  aiAllowance: {
    plan: "free" | "pro";
    limit: number;
    used: number;
    remaining: number;
    resetsAt: Date;
    breakdown: { action: AiFeature; credits: number; count: number }[];
  };
  /**
   * "settings" stacks it under the other Settings sections (top border, own
   * heading). "standalone" drops both because the page already provides an
   * <h1>.
   */
  layout?: "settings" | "standalone";
}) {
  const standalone = layout === "standalone";
  const paid = hasPaidSubscription(subscriptionStatus);
  const noticeMessage = notice ? BILLING_MESSAGES[notice] : null;
  const usagePercent = Math.min(
    100,
    Math.round((aiAllowance.used / Math.max(1, aiAllowance.limit)) * 100),
  );
  const resetLabel = new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
  }).format(aiAllowance.resetsAt);
  const periodEndLabel = currentPeriodEnd
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(
        currentPeriodEnd,
      )
    : null;
  // While a paid sub is pending cancellation it keeps Pro access (and the
  // Pro allowance) until `currentPeriodEnd`; only after that does the plan
  // actually fall back to Free. Saying "resets" through that boundary would
  // wrongly imply another Pro-sized allowance is coming.
  const usageResetLabel =
    paid && cancelAtPeriodEnd && periodEndLabel
      ? `Pro access ends ${periodEndLabel}, then drops to the Free plan's ${MONTHLY_AI_ALLOWANCE.free}/month`
      : `resets ${resetLabel}`;
  const recentlyDowngraded = wasRecentlyDowngraded({
    paid,
    subscriptionStatus,
    currentPeriodEnd,
  });

  return (
    <section
      className={
        standalone ? "" : "border-t border-[var(--border-strong)] pt-7"
      }
      aria-labelledby="billing-heading"
    >
      <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)] sm:items-start sm:gap-10">
        <div>
          <h2
            id="billing-heading"
            className={standalone ? "sr-only" : "font-semibold"}
          >
            Plan and billing
          </h2>
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
                Subscription status: {subscriptionStatus.replaceAll("_", " ")}
              </p>
            )}
            {paid && periodEndLabel && (
              <p className="mt-1 text-xs text-[var(--muted)]">
                {cancelAtPeriodEnd ? "Access ends" : "Renews"} {periodEndLabel}
              </p>
            )}
          </div>

          {recentlyDowngraded && periodEndLabel && (
            <p className="rounded-md border border-[var(--border-strong)] bg-[var(--surface-subtle)] px-3 py-2 text-xs text-[var(--foreground)]">
              Your Pro plan ended on {periodEndLabel}. You&apos;re now on the
              Free plan.
            </p>
          )}

          <div>
            <div className="flex items-center justify-between text-xs">
              <p className="font-semibold tracking-[0.12em] text-[var(--muted)] uppercase">
                AI usage this month
              </p>
              <p className="text-[var(--muted)]">
                {aiAllowance.used} / {aiAllowance.limit}{" "}
                <span className="group relative inline-block">
                  <span
                    tabIndex={0}
                    role="note"
                    aria-label="What credits mean"
                    className="cursor-help underline decoration-dotted underline-offset-2 outline-none focus-visible:decoration-solid"
                  >
                    credits
                  </span>
                  <span
                    role="tooltip"
                    className="pointer-events-none absolute right-0 top-full z-20 mt-2 w-64 rounded-lg border border-[var(--border-strong)] bg-[var(--surface-raised)] p-3 text-left text-xs leading-5 font-normal text-[var(--foreground)] opacity-0 shadow-[var(--shadow)] transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    Credits are weighted AI actions, not tokens or currency.
                    Planning follow-ups cost 1; generating a document or
                    actioning a batch of comments costs 5. The premium Opus
                    model doubles each cost. Resets monthly.
                  </span>
                </span>
              </p>
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-subtle)]">
              <div
                className="h-full rounded-full bg-[var(--accent-strong)]"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              {aiAllowance.remaining} credit
              {aiAllowance.remaining === 1 ? "" : "s"} left · {usageResetLabel}
              {aiAllowance.plan === "free" &&
                ". Upgrade to Pro for a higher allowance."}
            </p>

            {aiAllowance.breakdown.length > 0 && (
              <dl className="mt-3 space-y-1 border-t border-[var(--border)] pt-2 text-xs">
                {aiAllowance.breakdown.map((row) => (
                  <div
                    key={row.action}
                    className="flex items-center justify-between gap-3"
                  >
                    <dt className="text-[var(--muted)]">
                      {aiCreditActionLabel(row.action)}
                      {row.count > 1 ? ` ×${row.count}` : ""}
                    </dt>
                    <dd className="tabular-nums text-[var(--foreground)]">
                      {row.credits}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            <Link
              href="/billing/usage"
              className="mt-2 inline-block text-xs text-[var(--muted)] underline underline-offset-2 hover:text-[var(--foreground)]"
            >
              View usage history
            </Link>
          </div>

          {paid ? (
            <div className="flex flex-col gap-2">
              {cancelAtPeriodEnd && periodEndLabel && (
                <p className="text-xs text-[var(--muted)]">
                  Changed your mind? You can resume your subscription anytime
                  before {periodEndLabel}.
                </p>
              )}
              <form action={openBillingPortal}>
                <button
                  type="submit"
                  className="secondary-button w-full rounded-md px-3 py-2.5 text-sm font-semibold"
                >
                  {cancelAtPeriodEnd
                    ? "Manage billing · Resume"
                    : "Manage billing"}
                </button>
              </form>
            </div>
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
