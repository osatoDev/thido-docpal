import { describe, expect, it } from "vitest";

import { calculateSideMenuPosition } from "@/lib/menuPosition";

describe("side menu positioning", () => {
  it("opens to the right and aligns with its parent item when space permits", () => {
    expect(
      calculateSideMenuPosition({
        anchor: { left: 100, right: 300, top: 120 },
        menuHeight: 240,
        menuWidth: 256,
        viewportHeight: 800,
        viewportWidth: 1200,
      }),
    ).toEqual({ left: 304, maxHeight: 784, side: "right", top: 114 });
  });

  it("opens to the left when the right side would leave the viewport", () => {
    expect(
      calculateSideMenuPosition({
        anchor: { left: 700, right: 940, top: 200 },
        menuHeight: 200,
        menuWidth: 256,
        viewportHeight: 800,
        viewportWidth: 1000,
      }),
    ).toMatchObject({ left: 440, side: "left", top: 194 });
  });

  it("keeps a submenu inside narrow and short viewports", () => {
    expect(
      calculateSideMenuPosition({
        anchor: { left: 20, right: 280, top: 700 },
        menuHeight: 900,
        menuWidth: 256,
        viewportHeight: 640,
        viewportWidth: 320,
      }),
    ).toEqual({ left: 56, maxHeight: 624, side: "right", top: 8 });
  });
});
