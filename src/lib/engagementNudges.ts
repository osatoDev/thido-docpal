export const ACTIVATION_NUDGE_MIN_AGE_MS = 6 * 60 * 60 * 1000;
export const ACTIVATION_NUDGE_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export function isWithinActivationNudgeWindow(createdAt: Date, now: Date) {
  const ageMs = now.getTime() - createdAt.getTime();
  return (
    ageMs >= ACTIVATION_NUDGE_MIN_AGE_MS && ageMs <= ACTIVATION_NUDGE_MAX_AGE_MS
  );
}

