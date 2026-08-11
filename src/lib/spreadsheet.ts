export const DEFAULT_SPREADSHEET_ROWS = 30;
export const DEFAULT_SPREADSHEET_COLUMNS = 12;
export const MAX_SPREADSHEET_ROWS = 500;
export const MAX_SPREADSHEET_COLUMNS = 50;
export const MAX_SPREADSHEET_CELL_LENGTH = 10_000;
const MAX_SPREADSHEET_TEXT_LENGTH = 500_000;
const CELL_REFERENCE = /^([A-Z]+)([1-9]\d*)$/;
const CELL_REFERENCE_IN_FORMULA = /\b([A-Z]+[1-9]\d*)\b/g;
const RANGE_FUNCTION =
  /\b(SUM|AVERAGE|MIN|MAX|COUNT)\(\s*([A-Z]+[1-9]\d*)\s*:\s*([A-Z]+[1-9]\d*)\s*\)/g;
const NUMERIC_VALUE = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

export type SpreadsheetContent = {
  cells: Record<string, string>;
  columns: number;
  rows: number;
  version: 1;
};

export function createEmptySpreadsheetContent(): SpreadsheetContent {
  return {
    cells: {},
    columns: DEFAULT_SPREADSHEET_COLUMNS,
    rows: DEFAULT_SPREADSHEET_ROWS,
    version: 1,
  };
}

export function createDefaultSpreadsheetTitle(date = new Date()) {
  return `Untitled Spreadsheet - ${date
    .toISOString()
    .slice(0, 16)
    .replace("T", " ")} UTC`;
}

export function spreadsheetColumnLabel(columnIndex: number) {
  let value = columnIndex + 1;
  let label = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }
  return label;
}

function spreadsheetColumnIndex(label: string) {
  let value = 0;
  for (const character of label) {
    value = value * 26 + character.charCodeAt(0) - 64;
  }
  return value - 1;
}

export function spreadsheetCellReference(rowIndex: number, columnIndex: number) {
  return `${spreadsheetColumnLabel(columnIndex)}${rowIndex + 1}`;
}

export function parseSpreadsheetCellReference(reference: string) {
  const match = CELL_REFERENCE.exec(reference.trim().toUpperCase());
  if (!match) return null;
  const rowIndex = Number(match[2]) - 1;
  const columnIndex = spreadsheetColumnIndex(match[1]);
  if (!Number.isSafeInteger(rowIndex) || !Number.isSafeInteger(columnIndex)) {
    return null;
  }
  return { columnIndex, rowIndex };
}

export function normalizeSpreadsheetContent(
  value: unknown,
): SpreadsheetContent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== 1 ||
    !Number.isInteger(candidate.rows) ||
    !Number.isInteger(candidate.columns)
  ) {
    return null;
  }
  const rows = candidate.rows as number;
  const columns = candidate.columns as number;
  if (
    rows < 1 ||
    rows > MAX_SPREADSHEET_ROWS ||
    columns < 1 ||
    columns > MAX_SPREADSHEET_COLUMNS ||
    !candidate.cells ||
    typeof candidate.cells !== "object" ||
    Array.isArray(candidate.cells)
  ) {
    return null;
  }

  const entries = Object.entries(candidate.cells as Record<string, unknown>);
  if (entries.length > rows * columns) return null;
  const cells: Record<string, string> = {};
  let totalTextLength = 0;
  for (const [rawReference, rawValue] of entries) {
    if (
      typeof rawValue !== "string" ||
      rawValue.length > MAX_SPREADSHEET_CELL_LENGTH
    ) {
      return null;
    }
    const reference = rawReference.toUpperCase();
    const coordinates = parseSpreadsheetCellReference(reference);
    if (
      !coordinates ||
      coordinates.rowIndex >= rows ||
      coordinates.columnIndex >= columns
    ) {
      return null;
    }
    totalTextLength += rawValue.length;
    if (totalTextLength > MAX_SPREADSHEET_TEXT_LENGTH) return null;
    if (rawValue) cells[reference] = rawValue;
  }

  return { cells, columns, rows, version: 1 };
}

export function pasteSpreadsheetText(
  content: SpreadsheetContent,
  startReference: string,
  text: string,
) {
  const start = parseSpreadsheetCellReference(startReference);
  if (!start) return content;
  const rows = text.replace(/\r\n?/g, "\n").split("\n");
  while (rows.length > 1 && rows.at(-1) === "") rows.pop();
  const values = rows.map((row) => row.split("\t"));
  const pastedColumns = Math.max(...values.map((row) => row.length));
  const nextRows = Math.min(
    MAX_SPREADSHEET_ROWS,
    Math.max(content.rows, start.rowIndex + values.length),
  );
  const nextColumns = Math.min(
    MAX_SPREADSHEET_COLUMNS,
    Math.max(content.columns, start.columnIndex + pastedColumns),
  );
  const cells = { ...content.cells };

  for (let rowOffset = 0; rowOffset < values.length; rowOffset += 1) {
    for (
      let columnOffset = 0;
      columnOffset < values[rowOffset].length;
      columnOffset += 1
    ) {
      const rowIndex = start.rowIndex + rowOffset;
      const columnIndex = start.columnIndex + columnOffset;
      if (rowIndex >= nextRows || columnIndex >= nextColumns) continue;
      const reference = spreadsheetCellReference(rowIndex, columnIndex);
      const value = values[rowOffset][columnOffset].slice(
        0,
        MAX_SPREADSHEET_CELL_LENGTH,
      );
      if (value) cells[reference] = value;
      else delete cells[reference];
    }
  }

  return { ...content, cells, columns: nextColumns, rows: nextRows };
}

class FormulaFailure extends Error {
  constructor(readonly display: string) {
    super(display);
  }
}

class ArithmeticParser {
  private position = 0;

  constructor(private readonly expression: string) {}

  parse() {
    const value = this.parseExpression();
    this.skipSpaces();
    if (this.position !== this.expression.length || !Number.isFinite(value)) {
      throw new FormulaFailure("#ERROR!");
    }
    return value;
  }

  private parseExpression(): number {
    let value = this.parseTerm();
    while (true) {
      this.skipSpaces();
      const operator = this.expression[this.position];
      if (operator !== "+" && operator !== "-") return value;
      this.position += 1;
      const right = this.parseTerm();
      value = operator === "+" ? value + right : value - right;
    }
  }

  private parseTerm(): number {
    let value = this.parsePower();
    while (true) {
      this.skipSpaces();
      const operator = this.expression[this.position];
      if (operator !== "*" && operator !== "/") return value;
      this.position += 1;
      const right = this.parsePower();
      if (operator === "/" && right === 0) {
        throw new FormulaFailure("#DIV/0!");
      }
      value = operator === "*" ? value * right : value / right;
    }
  }

  private parsePower(): number {
    const value = this.parseUnary();
    this.skipSpaces();
    if (this.expression[this.position] !== "^") return value;
    this.position += 1;
    return value ** this.parsePower();
  }

  private parseUnary(): number {
    this.skipSpaces();
    const operator = this.expression[this.position];
    if (operator === "+" || operator === "-") {
      this.position += 1;
      const value = this.parseUnary();
      return operator === "-" ? -value : value;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    this.skipSpaces();
    if (this.expression[this.position] === "(") {
      this.position += 1;
      const value = this.parseExpression();
      this.skipSpaces();
      if (this.expression[this.position] !== ")") {
        throw new FormulaFailure("#ERROR!");
      }
      this.position += 1;
      return value;
    }

    const match = /^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i.exec(
      this.expression.slice(this.position),
    );
    if (!match) throw new FormulaFailure("#ERROR!");
    this.position += match[0].length;
    return Number(match[0]);
  }

  private skipSpaces() {
    while (/\s/.test(this.expression[this.position] ?? "")) {
      this.position += 1;
    }
  }
}

function formatFormulaNumber(value: number) {
  if (!Number.isFinite(value)) return "#ERROR!";
  if (Object.is(value, -0)) return "0";
  return String(Number(value.toPrecision(12)));
}

function rangeReferences(
  content: SpreadsheetContent,
  startReference: string,
  endReference: string,
) {
  const start = parseSpreadsheetCellReference(startReference);
  const end = parseSpreadsheetCellReference(endReference);
  if (
    !start ||
    !end ||
    start.rowIndex >= content.rows ||
    end.rowIndex >= content.rows ||
    start.columnIndex >= content.columns ||
    end.columnIndex >= content.columns
  ) {
    return [];
  }
  const references: string[] = [];
  for (
    let rowIndex = Math.min(start.rowIndex, end.rowIndex);
    rowIndex <= Math.max(start.rowIndex, end.rowIndex);
    rowIndex += 1
  ) {
    for (
      let columnIndex = Math.min(start.columnIndex, end.columnIndex);
      columnIndex <= Math.max(start.columnIndex, end.columnIndex);
      columnIndex += 1
    ) {
      references.push(spreadsheetCellReference(rowIndex, columnIndex));
    }
  }
  return references;
}

export function calculateSpreadsheetValues(content: SpreadsheetContent) {
  const cache = new Map<string, string>();
  const visiting = new Set<string>();

  function evaluateCell(reference: string): string {
    const normalizedReference = reference.toUpperCase();
    const cached = cache.get(normalizedReference);
    if (cached !== undefined) return cached;
    const rawValue = content.cells[normalizedReference] ?? "";
    if (!rawValue.startsWith("=")) {
      cache.set(normalizedReference, rawValue);
      return rawValue;
    }
    if (visiting.has(normalizedReference)) {
      throw new FormulaFailure("#CYCLE!");
    }

    visiting.add(normalizedReference);
    try {
      let expression = rawValue.slice(1).toUpperCase();
      expression = expression.replace(
        RANGE_FUNCTION,
        (_match, rawFunction: string, start: string, end: string) => {
          const values = rangeReferences(content, start, end).flatMap(
            (rangeReference) => {
              const display = evaluateCell(rangeReference);
              if (display.startsWith("#")) {
                throw new FormulaFailure(display);
              }
              const trimmed = display.trim();
              return NUMERIC_VALUE.test(trimmed) ? [Number(trimmed)] : [];
            },
          );
          const functionName = rawFunction.toUpperCase();
          if (functionName === "COUNT") return String(values.length);
          if (functionName === "SUM") {
            return String(values.reduce((sum, value) => sum + value, 0));
          }
          if (functionName === "AVERAGE") {
            if (values.length === 0) throw new FormulaFailure("#DIV/0!");
            return String(
              values.reduce((sum, value) => sum + value, 0) / values.length,
            );
          }
          if (values.length === 0) return "0";
          return String(
            functionName === "MIN" ? Math.min(...values) : Math.max(...values),
          );
        },
      );
      expression = expression.replace(
        CELL_REFERENCE_IN_FORMULA,
        (_match, referencedCell: string) => {
          const coordinates = parseSpreadsheetCellReference(referencedCell);
          if (
            !coordinates ||
            coordinates.rowIndex >= content.rows ||
            coordinates.columnIndex >= content.columns
          ) {
            return "0";
          }
          const display = evaluateCell(referencedCell);
          if (display.startsWith("#")) throw new FormulaFailure(display);
          const trimmed = display.trim();
          return NUMERIC_VALUE.test(trimmed) ? String(Number(trimmed)) : "0";
        },
      );
      const display = formatFormulaNumber(new ArithmeticParser(expression).parse());
      cache.set(normalizedReference, display);
      return display;
    } catch (reason) {
      const display =
        reason instanceof FormulaFailure ? reason.display : "#ERROR!";
      cache.set(normalizedReference, display);
      return display;
    } finally {
      visiting.delete(normalizedReference);
    }
  }

  const values: Record<string, string> = {};
  for (const reference of Object.keys(content.cells)) {
    values[reference] = evaluateCell(reference);
  }
  return values;
}
