export const DEFAULT_PLAN_FEEDBACK_DAILY_LIMIT = 3;
export const PLAN_FEEDBACK_DAILY_LIMIT_OPTIONS = [0, 1, 2, 3, 5, 10] as const;
/**
 * Chance that a new entry earns automatic feedback while the daily cap has
 * room. Below 1 so feedback lands at random points in the day rather than on
 * the first few entries.
 */
export const AUTO_FEEDBACK_CHANCE = 0.4;

export function isPlanFeedbackDailyLimit(value: unknown): value is number {
  return typeof value === "number" && PLAN_FEEDBACK_DAILY_LIMIT_OPTIONS.some(option => option === value);
}

export function shouldGiveAutoFeedback({
  givenToday,
  dailyLimit,
  random = Math.random(),
}: {
  givenToday: number;
  dailyLimit: number;
  random?: number;
}) {
  return dailyLimit > 0 && givenToday < dailyLimit && random < AUTO_FEEDBACK_CHANCE;
}

export function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}
