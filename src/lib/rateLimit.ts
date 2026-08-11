/**
 * Best-effort in-memory sliding-window rate limiter, scoped per server
 * instance. Good enough to stop a single runaway client from hammering the
 * (paid, latency-sensitive) AI routes in this deployment's current form.
 *
 * Note: on Vercel this state is per serverless instance, not shared across
 * them. For a hard global limit under real multi-instance load, replace
 * this with a shared store (e.g. Upstash Redis).
 */
const requestLog = new Map<string, number[]>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): boolean {
  const now = Date.now();
  const timestamps = (requestLog.get(key) ?? []).filter(
    (t) => now - t < windowMs,
  );

  if (timestamps.length >= limit) {
    requestLog.set(key, timestamps);
    return false;
  }

  timestamps.push(now);
  requestLog.set(key, timestamps);
  return true;
}
