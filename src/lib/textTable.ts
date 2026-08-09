import type { JSONContent } from "@tiptap/core";

export type DetectedTextTable = {
  rows: string[][];
  source: "CSV" | "MARKDOWN" | "SPACES" | "TSV";
};

const MAX_TABLE_TEXT_LENGTH = 20_000;
const MAX_TABLE_ROWS = 100;
const MAX_TABLE_COLUMNS = 20;
const MARKDOWN_SEPARATOR = /^:?-{3,}:?$/;

function normalizeRows(rows: string[][], source: DetectedTextTable["source"]) {
  const normalized = rows.map((row) => row.map((cell) => cell.trim()));
  const columnCount = normalized[0]?.length ?? 0;
  if (
    normalized.length < 2 ||
    normalized.length > MAX_TABLE_ROWS ||
    columnCount < 2 ||
    columnCount > MAX_TABLE_COLUMNS ||
    normalized.some((row) => row.length !== columnCount) ||
    normalized.some((row) => row.filter(Boolean).length < 2)
  ) {
    return null;
  }
  return { rows: normalized, source } satisfies DetectedTextTable;
}

function pipeCells(line: string) {
  const cells = line.split("|");
  if (cells[0]?.trim() === "") cells.shift();
  if (cells.at(-1)?.trim() === "") cells.pop();
  return cells;
}

function parseCsvLine(line: string) {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }
  if (quoted) return null;
  cells.push(cell);
  return cells;
}

export function detectTextTable(text: string): DetectedTextTable | null {
  if (!text.trim() || text.length > MAX_TABLE_TEXT_LENGTH) return null;
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2 || lines.length > MAX_TABLE_ROWS + 1) return null;

  if (lines.every((line) => line.includes("|"))) {
    const rows = lines.map(pipeCells);
    const hasSeparator = rows[1]?.every((cell) =>
      MARKDOWN_SEPARATOR.test(cell.trim()),
    );
    if (hasSeparator) rows.splice(1, 1);
    if (hasSeparator || rows.length >= 3) {
      const table = normalizeRows(rows, "MARKDOWN");
      if (table) return table;
    }
  }

  if (lines.every((line) => line.includes("\t"))) {
    const table = normalizeRows(
      lines.map((line) => line.split("\t")),
      "TSV",
    );
    if (table) return table;
  }

  if (lines.length >= 3 && lines.every((line) => line.includes(","))) {
    const rows = lines.map(parseCsvLine);
    if (rows.every((row): row is string[] => row !== null)) {
      const table = normalizeRows(rows, "CSV");
      if (table) return table;
    }
  }

  if (lines.length >= 3 && lines.every((line) => /\S\s{2,}\S/.test(line))) {
    return normalizeRows(
      lines.map((line) => line.split(/\s{2,}/)),
      "SPACES",
    );
  }

  return null;
}

function paragraphContent(text: string): JSONContent {
  return {
    type: "paragraph",
    ...(text ? { content: [{ type: "text", text }] } : {}),
  };
}

export function textTableToTiptapNode(table: DetectedTextTable): JSONContent {
  return {
    type: "table",
    content: table.rows.map((row, rowIndex) => ({
      type: "tableRow",
      content: row.map((cell) => ({
        type: rowIndex === 0 ? "tableHeader" : "tableCell",
        content: [paragraphContent(cell)],
      })),
    })),
  };
}

export function plainTextToTiptapNodes(text: string): JSONContent[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(paragraphContent);
}
