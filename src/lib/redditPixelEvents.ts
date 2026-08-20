declare global {
  interface Window {
    rdt?: (...args: unknown[]) => void;
  }
}

export function trackRedditConversion(event: string, conversionId: string) {
  if (process.env.NODE_ENV !== "production") return;
  window.rdt?.("track", event, { conversionId });
}
