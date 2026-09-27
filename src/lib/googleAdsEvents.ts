import { GOOGLE_ADS_TAG_ID } from "@/components/GoogleAdsTag";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const SIGNUP_CONVERSION_LABEL = "MVZJCLq47IAdENSiraJD";

export function trackSignupConversion(conversionId: string) {
  if (process.env.NODE_ENV !== "production") return;
  window.gtag?.("event", "conversion", {
    send_to: `${GOOGLE_ADS_TAG_ID}/${SIGNUP_CONVERSION_LABEL}`,
    transaction_id: conversionId,
  });
}
