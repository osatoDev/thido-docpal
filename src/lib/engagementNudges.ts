export const ACTIVATION_NUDGE_MIN_AGE_MS = 6 * 60 * 60 * 1000;
export const ACTIVATION_NUDGE_MAX_AGE_MS = 48 * 60 * 60 * 1000;
export const REACTIVATION_NUDGE_MIN_IDLE_MS = 20 * 60 * 60 * 1000;
export const REACTIVATION_NUDGE_MAX_IDLE_MS = 48 * 60 * 60 * 1000;

export function isWithinActivationNudgeWindow(createdAt: Date, now: Date) {
  const ageMs = now.getTime() - createdAt.getTime();
  return (
    ageMs >= ACTIVATION_NUDGE_MIN_AGE_MS && ageMs <= ACTIVATION_NUDGE_MAX_AGE_MS
  );
}

export function isWithinReactivationNudgeWindow(
  lastActivityAt: Date,
  now: Date,
) {
  const idleMs = now.getTime() - lastActivityAt.getTime();
  return (
    idleMs >= REACTIVATION_NUDGE_MIN_IDLE_MS &&
    idleMs <= REACTIVATION_NUDGE_MAX_IDLE_MS
  );
}
