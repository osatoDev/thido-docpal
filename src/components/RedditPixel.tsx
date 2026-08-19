import Script from "next/script";

const REDDIT_PIXEL_ID = "a2_jjirkvc8nv8u";

type RedditPixelProps = {
  email?: string | null;
  externalId?: string | null;
};

export function RedditPixel({ email, externalId }: RedditPixelProps = {}) {
  if (process.env.NODE_ENV !== "production") return null;

  const matchKeys: Record<string, string> = {};
  if (email) matchKeys.email = email;
  if (externalId) matchKeys.externalId = externalId;
  // Escape "<" so a value can't break out of the inline <script> tag.
  const matchKeysJson = JSON.stringify(matchKeys).replace(/</g, "\\u003c");

  return (
    <Script id="reddit-pixel" strategy="afterInteractive">
      {`
        !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.callQueue.push(arguments)};p.callQueue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/pixel.js?pixel_id=${REDDIT_PIXEL_ID}",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
        rdt('init','${REDDIT_PIXEL_ID}', ${matchKeysJson});
        rdt('track', 'PageVisit');
      `}
    </Script>
  );
}
