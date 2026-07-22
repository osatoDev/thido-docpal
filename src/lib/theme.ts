export type Theme = "light" | "dark";

export const THEME_COOKIE_NAME = "thido-theme";

export function isTheme(value: unknown): value is Theme {
  return value === "light" || value === "dark";
}
