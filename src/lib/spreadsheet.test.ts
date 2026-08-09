import { describe, expect, it } from "vitest";

import {
  calculateSpreadsheetValues,
  createEmptySpreadsheetContent,
  normalizeSpreadsheetContent,
  parseSpreadsheetCellReference,
  pasteSpreadsheetText,
  spreadsheetCellReference,
  spreadsheetColumnLabel,
} from "@/lib/spreadsheet";

describe("spreadsheet content", () => {
  it("converts column and cell coordinates", () => {
    expect(spreadsheetColumnLabel(0)).toBe("A");
    expect(spreadsheetColumnLabel(25)).toBe("Z");
    expect(spreadsheetColumnLabel(26)).toBe("AA");
    expect(spreadsheetCellReference(4, 27)).toBe("AB5");
    expect(parseSpreadsheetCellReference("ab5")).toEqual({
      columnIndex: 27,
      rowIndex: 4,
    });
  });

  it("normalizes valid sparse content and rejects invalid bounds", () => {
    expect(
      normalizeSpreadsheetContent({
        version: 1,
        rows: 2,
        columns: 2,
        cells: { a1: "Name", B2: "10", A2: "" },
      }),
    ).toEqual({
      version: 1,
      rows: 2,
      columns: 2,
      cells: { A1: "Name", B2: "10" },
    });
    expect(
      normalizeSpreadsheetContent({
        version: 1,
        rows: 2,
        columns: 2,
        cells: { C1: "outside" },
      }),
    ).toBeNull();
  });

  it("pastes tabular text and expands the grid", () => {
    const content = {
      ...createEmptySpreadsheetContent(),
      rows: 2,
      columns: 2,
    };
    expect(pasteSpreadsheetText(content, "B2", "Ada\t10\nGrace\t12")).toEqual({
      version: 1,
      rows: 3,
      columns: 3,
      cells: { B2: "Ada", C2: "10", B3: "Grace", C3: "12" },
    });
  });
});

describe("spreadsheet formulas", () => {
  it("evaluates arithmetic, cell references, and powers", () => {
    const content = {
      version: 1 as const,
      rows: 5,
      columns: 5,
      cells: {
        A1: "10",
        B1: "3",
        C1: "=A1+B1*2",
        D1: "=(A1-B1)^2",
      },
    };
    expect(calculateSpreadsheetValues(content)).toMatchObject({
      C1: "16",
      D1: "49",
    });
  });

  it("evaluates common range formulas while ignoring text", () => {
    const content = {
      version: 1 as const,
      rows: 5,
      columns: 5,
      cells: {
        A1: "10",
        A2: "20",
        A3: "Label",
        B1: "=SUM(A1:A3)",
        B2: "=AVERAGE(A1:A3)",
        B3: "=COUNT(A1:A3)",
        B4: "=MIN(A1:A3)+MAX(A1:A3)",
      },
    };
    expect(calculateSpreadsheetValues(content)).toMatchObject({
      B1: "30",
      B2: "15",
      B3: "2",
      B4: "30",
    });
  });

  it("reports invalid formulas, division by zero, and cycles", () => {
    const content = {
      version: 1 as const,
      rows: 3,
      columns: 3,
      cells: {
        A1: "=1/0",
        A2: "=not valid",
        B1: "=C1",
        C1: "=B1",
      },
    };
    expect(calculateSpreadsheetValues(content)).toMatchObject({
      A1: "#DIV/0!",
      A2: "#ERROR!",
      B1: "#CYCLE!",
      C1: "#CYCLE!",
    });
  });
});
