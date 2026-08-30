import { permanentRedirect } from "next/navigation";

/**
 * AI usage history moved under the dedicated billing area. Keep this path as a
 * permanent redirect for existing bookmarks and links in older emails.
 */
export default function LegacyUsageHistoryPage() {
  permanentRedirect("/billing/usage");
}
