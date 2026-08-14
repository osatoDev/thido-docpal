import { Mark, mergeAttributes } from "@tiptap/core";

export const FONT_FAMILY_OPTIONS = [
  { label: "Thido Sans", value: "" },
  { label: "Serif", value: "serif" },
  { label: "Sans serif", value: "sans-serif" },
  { label: "Monospace", value: "monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Calibri", value: "Calibri, Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "Times New Roman, serif" },
  { label: "Verdana", value: "Verdana, sans-serif" },
] as const;

export const FONT_SIZE_OPTIONS = [10, 11, 12, 14, 18, 24, 30] as const;

const CSS_WIDE_VALUES = new Set([
  "inherit",
  "initial",
  "revert",
  "revert-layer",
  "unset",
]);

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
  if (typeof value !== "string" || value.length > 200) return null;
  const families = value.split(",").map((family) => {
    const trimmed = family.trim();
    const unquoted =
      trimmed.length >= 2 &&
      ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'")))
        ? trimmed.slice(1, -1).trim()
        : trimmed;
    return unquoted;
  });
  if (
    families.length === 0 ||
    families.length > 4 ||
    families.some(
      (family) =>
        !family ||
        CSS_WIDE_VALUES.has(family.toLowerCase()) ||
        !/^[\p{L}\p{N}][\p{L}\p{N} ._-]{0,60}$/u.test(family),
    )
  ) {
    return null;
  }
  return families.join(", ");
}

function normalizeFontSize(value: unknown) {
  const size = Number(value);
  return Number.isFinite(size) && size >= 6 && size <= 96
    ? Math.round(size * 100) / 100
    : null;
}

function parseFontSize(value: string) {
  const match = /^(-?\d+(?:\.\d+)?)(pt|px)$/i.exec(value.trim());
  if (!match) return null;
  const size = Number(match[1]);
  return normalizeFontSize(match[2].toLowerCase() === "px" ? size * 0.75 : size);
}

export function normalizeDocumentColor(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent") return null;
  const shortHex = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(normalized);
  if (shortHex) {
    return `#${shortHex.slice(1).map((digit) => digit.repeat(2)).join("")}`;
  }
  if (/^#[0-9a-f]{6}$/.test(normalized)) return normalized;

  const rgb = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*(0|1|0?\.\d+))?\s*\)$/.exec(
    normalized,
  );
  if (!rgb) return null;
  const channels = rgb.slice(1, 4).map(Number);
  if (channels.some((channel) => channel > 255)) return null;
  if (rgb[4] !== undefined && Number(rgb[4]) === 0) return null;
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Pasted HTML from Word/Google Docs routinely carries an explicit
 * near-black (or, less often, near-white) inline text color as its
 * "default", even when the source author never deliberately chose one. If
 * Thido preserved that literally, the text becomes unreadable against a
 * background of the same shade after a later theme switch (most visibly,
 * near-black text disappearing into a dark background). Reject colors this
 * extreme when parsing pasted content so no explicit color mark is created
 * for what was really just default text; a deliberate in-app color choice
 * (see setTextColor below) is left alone.
 */
function isExtremeTextColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max <= 32 || min >= 224;
}

function normalizePastedTextColor(value: unknown) {
  const color = normalizeDocumentColor(value);
  return color && !isExtremeTextColor(color) ? color : null;
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
        parseHTML: (element) => parseFontSize(element.style.fontSize),
      },
      color: {
        default: null,
        parseHTML: (element) => normalizePastedTextColor(element.style.color),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "span[style]",
        getAttrs: (element) => {
          return normalizeFontFamily(element.style.fontFamily) ||
            parseFontSize(element.style.fontSize) ||
            normalizeDocumentColor(element.style.color)
            ? {}
            : false;
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const fontFamily = normalizeFontFamily(HTMLAttributes.fontFamily);
    const fontSize = normalizeFontSize(HTMLAttributes.fontSize);
    const color = normalizeDocumentColor(HTMLAttributes.color);
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
          commands.setMark(this.name, {
            color: normalizeDocumentColor(color),
          }),
    };
  },
});
