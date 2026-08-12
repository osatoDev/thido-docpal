const SECONDS_PER_DAY = 24 * 60 * 60;

// Chromium caps persistent cookies at 400 days. Auth-wrapped private routes
// refresh this rolling window, so ordinary use keeps the session alive until
// logout or a server-side security invalidation changes the session version.
export const AUTH_SESSION_MAX_AGE_SECONDS = 400 * SECONDS_PER_DAY;

export const AUTH_SESSION_OPTIONS = {
  strategy: "jwt" as const,
  maxAge: AUTH_SESSION_MAX_AGE_SECONDS,
};
