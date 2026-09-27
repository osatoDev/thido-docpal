import Script from "next/script";

// The Google tag Google Ads asks to be pasted on every page for conversion
// tracking. Split into the two scripts Google's own snippet uses (the
// external gtag.js loader, then the inline dataLayer/config call) rather
// than one script block, since next/script's children-as-code form is for
// inline scripts only; an external `src` needs its own <Script>.
export const GOOGLE_ADS_TAG_ID = "AW-18057220436";

export function GoogleAdsTag() {
  if (process.env.NODE_ENV !== "production") return null;

  return (
    <>
      <Script
        id="google-ads-tag-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ADS_TAG_ID}`}
      />
      <Script id="google-ads-tag-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GOOGLE_ADS_TAG_ID}');
        `}
      </Script>
    </>
  );
}
