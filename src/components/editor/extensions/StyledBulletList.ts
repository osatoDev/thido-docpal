import { BulletList } from "@tiptap/extension-list";

export const BULLET_STYLES = ["disc", "circle", "square"] as const;

export type BulletStyle = (typeof BULLET_STYLES)[number];

export function isBulletStyle(value: unknown): value is BulletStyle {
  return (
    typeof value === "string" &&
    BULLET_STYLES.includes(value as BulletStyle)
  );
}

export const StyledBulletList = BulletList.extend({
  addAttributes() {
    return {
      bulletStyle: {
        default: "disc",
        parseHTML: (element) => {
          const storedStyle = element.getAttribute("data-bullet-style");
          const inlineStyle = element.style.listStyleType;

          return [storedStyle, inlineStyle].find(isBulletStyle) ?? "disc";
        },
        renderHTML: (attributes) => {
          const bulletStyle = isBulletStyle(attributes.bulletStyle)
            ? attributes.bulletStyle
            : "disc";

          return {
            "data-bullet-style": bulletStyle,
            style: `list-style-type: ${bulletStyle}`,
          };
        },
      },
    };
  },
});
