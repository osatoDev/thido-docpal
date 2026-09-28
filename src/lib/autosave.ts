export const DEFAULT_AUTOSAVE_DELAY_SECONDS = 120;
export const AUTOSAVE_DELAY_OPTIONS = [5, 15, 30, 60, 120, 300] as const;

export function isAutosaveDelaySeconds(value: unknown): value is number {
  return typeof value === "number" && AUTOSAVE_DELAY_OPTIONS.some(seconds => seconds === value);
}
