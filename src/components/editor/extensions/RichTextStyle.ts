import { Mark, mergeAttributes } from "@tiptap/core";

export const FONT_FAMILY_OPTIONS = [
  { label: "Thido Sans", value: "" },
  { label: "Serif", value: "serif" },
  { label: "Sans serif", value: "sans-serif" },
  { label: "Monospace", value: "monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
] as const;

export const FONT_SIZE_OPTIONS = [10, 11, 12, 14, 18, 24, 30] as const;

const supportedFontFamilies = new Set<string>(
  FONT_FAMILY_OPTIONS.map((option) => option.value).filter(Boolean),
);

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    richTextStyle: {
      setFontFamily: (fontFamily: string | null) => ReturnType;
      setFontSize: (fontSize: number | null) => ReturnType;
      setTextColor: (color: string | null) => ReturnType;
    };
  }
}

function normalizeFontFamily(value: unknown) {
  return typeof value === "string" && supportedFontFamilies.has(value)
    ? value
    : null;
}

function normalizeFontSize(value: unknown) {
  const size = Number(value);
  return FONT_SIZE_OPTIONS.includes(size as (typeof FONT_SIZE_OPTIONS)[number])
    ? size
    : null;
}

function normalizeColor(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/.test(normalized) ? normalized : null;
}

export const RichTextStyle = Mark.create({
  name: "richTextStyle",

  addAttributes() {
    return {
      fontFamily: {
        default: null,
        parseHTML: (element) => normalizeFontFamily(element.style.fontFamily),
      },
      fontSize: {
        default: null,
        parseHTML: (element) =>
          normalizeFontSize(element.style.fontSize.replace("pt", "")),
      },
      color: {
        default: null,
        parseHTML: (element) => normalizeColor(element.style.color),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const fontFamily = normalizeFontFamily(HTMLAttributes.fontFamily);
    const fontSize = normalizeFontSize(HTMLAttributes.fontSize);
    const color = normalizeColor(HTMLAttributes.color);
    const styles = [
      fontFamily ? `font-family: ${fontFamily}` : null,
      fontSize ? `font-size: ${fontSize}pt` : null,
      color ? `color: ${color}` : null,
    ].filter(Boolean);

    return [
      "span",
      mergeAttributes(
        styles.length > 0 ? { style: styles.join("; ") } : {},
      ),
      0,
    ];
  },

  addCommands() {
    return {
      setFontFamily:
        (fontFamily) =>
        ({ commands }) =>
          commands.setMark(this.name, {
            fontFamily: normalizeFontFamily(fontFamily),
          }),
      setFontSize:
        (fontSize) =>
        ({ commands }) =>
          commands.setMark(this.name, { fontSize: normalizeFontSize(fontSize) }),
      setTextColor:
        (color) =>
        ({ commands }) =>
          commands.setMark(this.name, { color: normalizeColor(color) }),
    };
  },
});
