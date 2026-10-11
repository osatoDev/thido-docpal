import type { JSONContent } from "@tiptap/core";
import type { Node } from "@tiptap/pm/model";

export function validDay(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function todayDay() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
export function formatDay(date: string) {
  if (!validDay(date)) return "Choose a date";
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const part = (type: string) => parts.find(value => value.type === type)?.value;
  return `${part("month")} ${part("day")} ${part("weekday")}`;
}
export function readDays(doc: Node) {
  const days: { date: string; position: number; text: string; year: string; month: string; week: number }[] = [];
  doc.descendants((node, position) => {
    const date = node.attrs.date;
    if (node.type.name !== "dayHeader" || !validDay(date)) return;
    days.push({ date, position, text: node.textContent, year: date.slice(0, 4), month: date.slice(0, 7), week: Math.ceil(Number(date.slice(8)) / 7) });
  });
  return days.sort((a, b) => a.date.localeCompare(b.date) || a.position - b.position);
}

/** Include the date label in exports whose renderers only consume text nodes. */
export function daysForExport(node: JSONContent): JSONContent {
  if (node.type === "dayHeader") return {
    ...node, type: "paragraph", content: [
      { type: "text", text: formatDay(node.attrs?.date), marks: [{ type: "bold" }, { type: "italic" }] },
      ...(node.content?.length ? [{ type: "text", text: " — " }, ...node.content] : []),
    ],
  };
  return { ...node, ...(node.content ? { content: node.content.map(daysForExport) } : {}) };
}

const MONTH_NAMES = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Guess only recognizable, unambiguous dates; never rely on Date.parse's locale heuristics. */
export function guessDay(text: string, reference = todayDay()): string | null {
  if (!validDay(reference)) return null;
  const input = text.toLowerCase();
  const candidates = new Set<string>();
  let uncertain = false;
  const add = (year: number, month: number, day: number) => {
    const date = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (validDay(date)) candidates.add(date);
    else uncertain = true;
  };
  const shift = (amount: number) => {
    const date = new Date(`${reference}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() + amount);
    candidates.add(date.toISOString().slice(0, 10));
  };
  for (const match of input.matchAll(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/g)) {
    add(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  for (const match of input.matchAll(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{4}))?\b/g)) {
    const a = Number(match[1]);
    const b = Number(match[2]);
    const year = Number(match[3] || reference.slice(0, 4));
    if (a === b || a > 12) add(year, b, a);
    else if (b > 12) add(year, a, b);
    else uncertain = true; // 03/04 could mean March 4 or April 3.
  }
  const months = MONTH_NAMES.map(name => `${name}|${name.slice(0, 3)}`).join("|");
  const monthFirst = new RegExp(`\\b(${months})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "g");
  const dayFirst = new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(${months})\\.?(?:,?\\s+(\\d{4}))?\\b`, "g");
  for (const pattern of [monthFirst, dayFirst]) {
    for (const match of input.matchAll(pattern)) {
      const month = pattern === monthFirst ? match[1] : match[2];
      const day = pattern === monthFirst ? match[2] : match[1];
      add(Number(match[3] || reference.slice(0, 4)), MONTH_NAMES.findIndex(name => name.startsWith(month)) + 1, Number(day));
    }
  }
  const relativeOffsets: Record<string, number> = {
    "day after tomorrow": 2, "day before yesterday": -2,
    today: 0, tomorrow: 1, yesterday: -1,
  };
  for (const match of input.matchAll(/\b(day after tomorrow|day before yesterday|today|tomorrow|yesterday)\b/g)) {
    shift(relativeOffsets[match[1]]);
  }
  // A weekday beside an explicit date is descriptive, not a second inferred date.
  if (candidates.size === 0 && !uncertain) {
    const weekdays = new RegExp(`\\b(?:(next|this|last)\\s+)?(${WEEKDAY_NAMES.join("|")})\\b`, "g");
    const currentWeekday = new Date(`${reference}T12:00:00Z`).getUTCDay();
    for (const match of input.matchAll(weekdays)) {
      const target = WEEKDAY_NAMES.indexOf(match[2]);
      const ahead = (target - currentWeekday + 7) % 7;
      shift(match[1] === "last" ? -((currentWeekday - target + 7) % 7 || 7) : match[1] === "next" ? ahead || 7 : ahead);
    }
  }
  return !uncertain && candidates.size === 1 ? [...candidates][0] : null;
}

export function hasDayHeaders(doc: Node): boolean {
  let found = false;
  doc.descendants(node => {
    if (node.type.name === "dayHeader") found = true;
    return !found;
  });
  return found;
}
