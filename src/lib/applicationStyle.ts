export const APPLICATION_STYLE_OPTIONS = [
  {
    label: "Classic",
    value: "classic",
    description: "Traditional typography with comfortable spacing.",
  },
  {
    label: "Clean",
    value: "clean",
    description: "Crisp sans-serif typography and compact surfaces.",
  },
  {
    label: "Editorial",
    value: "editorial",
    description: "Publication-inspired typography and expressive headings.",
  },
  {
    label: "Warm",
    value: "warm",
    description: "Softer colors and a relaxed reading rhythm.",
  },
  {
    label: "Bold",
    value: "bold",
    description: "High-contrast accents and stronger interface hierarchy.",
  },
] as const;

export type ApplicationStyle =
  (typeof APPLICATION_STYLE_OPTIONS)[number]["value"];

export const DEFAULT_APPLICATION_STYLE: ApplicationStyle = "classic";
export const APPLICATION_STYLE_COOKIE_NAME = "thido-app-style";

export function isApplicationStyle(
  value: unknown,
): value is ApplicationStyle {
  return APPLICATION_STYLE_OPTIONS.some((option) => option.value === value);
}
