import { describe, expect, it } from "vitest";

import {
  APPLICATION_STYLE_OPTIONS,
  DEFAULT_APPLICATION_STYLE,
  isApplicationStyle,
} from "@/lib/applicationStyle";

describe("application styles", () => {
  it("recognizes every supported global style", () => {
    expect(APPLICATION_STYLE_OPTIONS.map((option) => option.value)).toEqual([
      "classic",
      "clean",
      "editorial",
      "warm",
      "bold",
    ]);
    expect(APPLICATION_STYLE_OPTIONS.every((option) => isApplicationStyle(option.value))).toBe(true);
  });

  it("rejects document-only or unknown values", () => {
    expect(DEFAULT_APPLICATION_STYLE).toBe("classic");
    expect(isApplicationStyle("page-style")).toBe(false);
    expect(isApplicationStyle(null)).toBe(false);
  });
});
