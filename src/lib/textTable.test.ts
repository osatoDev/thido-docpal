import { describe, expect, it } from "vitest";

import {
  detectTextTable,
  plainTextToTiptapNodes,
  textTableToTiptapNode,
} from "@/lib/textTable";

describe("text table detection", () => {
  it("recognizes tab-separated rows with consistent columns", () => {
    expect(detectTextTable("Name\tRole\nAda\tEngineer")).toEqual({
      source: "TSV",
      rows: [
        ["Name", "Role"],
        ["Ada", "Engineer"],
      ],
    });
  });

  it("recognizes a Markdown table and removes its separator row", () => {
    expect(
      detectTextTable("| Name | Status |\n| --- | :---: |\n| Draft | Ready |"),
    ).toEqual({
      source: "MARKDOWN",
      rows: [
        ["Name", "Status"],
        ["Draft", "Ready"],
      ],
    });
  });

  it("recognizes consistent CSV and aligned text blocks", () => {
    expect(detectTextTable("Name,Score\nAda,10\nGrace,9")?.source).toBe("CSV");
    expect(
      detectTextTable("Name   Score\nAda    10\nGrace  9")?.source,
    ).toBe("SPACES");
  });

  it("rejects ordinary prose and inconsistent delimiters", () => {
    expect(detectTextTable("Hello, this is ordinary prose.")).toBeNull();
    expect(detectTextTable("Name\tRole\nAda\tEngineer\tRemote")).toBeNull();
    expect(detectTextTable("First line\nSecond line")).toBeNull();
  });

  it("builds a TipTap table with the first row as headers", () => {
    const table = detectTextTable("Name\tRole\nAda\tEngineer");
    expect(table && textTableToTiptapNode(table)).toMatchObject({
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            { type: "tableHeader", content: [{ type: "paragraph" }] },
            { type: "tableHeader", content: [{ type: "paragraph" }] },
          ],
        },
        {
          type: "tableRow",
          content: [
            { type: "tableCell", content: [{ type: "paragraph" }] },
            { type: "tableCell", content: [{ type: "paragraph" }] },
          ],
        },
      ],
    });
  });

  it("keeps every plain-text line when conversion is declined", () => {
    expect(plainTextToTiptapNodes("One\n\nTwo")).toEqual([
      { type: "paragraph", content: [{ type: "text", text: "One" }] },
      { type: "paragraph" },
      { type: "paragraph", content: [{ type: "text", text: "Two" }] },
    ]);
  });
});
