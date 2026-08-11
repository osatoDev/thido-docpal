import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const SOURCE_ROOT = fileURLToPath(new URL("../", import.meta.url));
const SOURCE_EXTENSIONS = new Set([".css", ".ts", ".tsx"]);
const EM_DASH = String.fromCodePoint(0x2014);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return SOURCE_EXTENSIONS.has(extname(entry.name)) ? [path] : [];
  });
}

describe("product copy", () => {
  it("contains no literal em dashes in application source", () => {
    const filesWithEmDashes = sourceFiles(SOURCE_ROOT)
      .filter((path) => readFileSync(path, "utf8").includes(EM_DASH))
      .map((path) => path.slice(SOURCE_ROOT.length));

    expect(filesWithEmDashes).toEqual([]);
  });
});
