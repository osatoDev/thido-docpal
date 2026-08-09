export type SideMenuPosition = {
  left: number;
  maxHeight: number;
  side: "left" | "right";
  top: number;
};

type AnchorBounds = {
  left: number;
  right: number;
  top: number;
};

export function calculateSideMenuPosition({
  anchor,
  menuHeight,
  menuWidth,
  viewportHeight,
  viewportWidth,
  gap = 4,
  gutter = 8,
  panelPadding = 6,
}: {
  anchor: AnchorBounds;
  menuHeight: number;
  menuWidth: number;
  viewportHeight: number;
  viewportWidth: number;
  gap?: number;
  gutter?: number;
  panelPadding?: number;
}): SideMenuPosition {
  const maxHeight = Math.max(0, viewportHeight - gutter * 2);
  const maximumLeft = Math.max(gutter, viewportWidth - gutter - menuWidth);
  const rightLeft = anchor.right + gap;
  const leftLeft = anchor.left - gap - menuWidth;
  const opensRight =
    rightLeft + menuWidth <= viewportWidth - gutter || leftLeft < gutter;
  const naturalLeft = opensRight ? rightLeft : leftLeft;
  const left = Math.min(Math.max(naturalLeft, gutter), maximumLeft);
  const visibleHeight = Math.min(menuHeight, maxHeight);
  const maximumTop = Math.max(gutter, viewportHeight - gutter - visibleHeight);
  const top = Math.min(Math.max(anchor.top - panelPadding, gutter), maximumTop);

  return {
    left,
    maxHeight,
    side: opensRight ? "right" : "left",
    top,
  };
}
