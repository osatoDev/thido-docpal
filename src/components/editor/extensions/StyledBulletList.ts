import { BulletList } from "@tiptap/extension-list";

export const BULLET_STYLES = [
  "disc",
  "circle",
  "square",
  "diamond",
  "arrow",
  "star",
  "check",
  "dash",
  "custom",
] as const;

export type BulletStyle = (typeof BULLET_STYLES)[number];

export const BULLET_STYLE_GLYPHS: Record<
  Exclude<BulletStyle, "custom">,
  string
> = {
  disc: "•",
  circle: "○",
  square: "▪",
  diamond: "◆",
  arrow: "➤",
  star: "★",
  check: "✓",
  dash: "–",
};

export function isBulletStyle(value: unknown): value is BulletStyle {
  return (
    typeof value === "string" &&
    BULLET_STYLES.includes(value as BulletStyle)
  );
}

export function normalizeCustomBulletGlyph(value: unknown) {
  if (typeof value !== "string") return null;
  const glyph = value.trim();
  if (!glyph || glyph.length > 16) return null;

  const graphemes = Array.from(
    new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(glyph),
    (segment) => segment.segment,
  );
  if (graphemes.length !== 1) return null;
  if (/^[\p{Letter}\p{Number}]|[\s\p{Control}"'\\;{}<>]/u.test(glyph)) {
    return null;
  }
  return glyph;
}

export function bulletGlyph(attributes: Record<string, unknown> | undefined) {
  const style = isBulletStyle(attributes?.bulletStyle)
    ? attributes.bulletStyle
    : "disc";
  return style === "custom"
    ? normalizeCustomBulletGlyph(attributes?.bulletGlyph) ??
        BULLET_STYLE_GLYPHS.disc
    : BULLET_STYLE_GLYPHS[style];
}

export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      bulletStyle: {
        default: "disc",
        parseHTML: (element) => {
          const storedStyle = element.getAttribute("data-bullet-style");
          const inlineStyle = element.style.listStyleType;

          if (storedStyle === "custom") {
            return normalizeCustomBulletGlyph(
              element.getAttribute("data-bullet-glyph"),
            )
              ? "custom"
              : "disc";
          }

          return [storedStyle, inlineStyle].find(isBulletStyle) ?? "disc";
        },
        renderHTML: (attributes) => {
          const requestedStyle = isBulletStyle(attributes.bulletStyle)
            ? attributes.bulletStyle
            : "disc";
          const customGlyph = normalizeCustomBulletGlyph(attributes.bulletGlyph);
          const bulletStyle =
            requestedStyle === "custom" && !customGlyph
              ? "disc"
              : requestedStyle;

          const listStyleType =
            bulletStyle === "custom"
              ? JSON.stringify(customGlyph)
              : bulletStyle === "disc" ||
                  bulletStyle === "circle" ||
                  bulletStyle === "square"
                ? bulletStyle
              : bulletStyle in BULLET_STYLE_GLYPHS
                ? JSON.stringify(
                    BULLET_STYLE_GLYPHS[
                      bulletStyle as Exclude<BulletStyle, "custom">
                    ],
                  )
                : "disc";

          return {
            "data-bullet-style": bulletStyle,
            style: `list-style-type: ${listStyleType}`,
          };
        },
      },
      bulletGlyph: {
        default: null,
        parseHTML: (element) =>
          normalizeCustomBulletGlyph(element.getAttribute("data-bullet-glyph")),
        renderHTML: (attributes) => {
          if (attributes.bulletStyle !== "custom") return {};
          const glyph = normalizeCustomBulletGlyph(attributes.bulletGlyph);
          return glyph ? { "data-bullet-glyph": glyph } : {};
        },
      },
    };
  },
});
