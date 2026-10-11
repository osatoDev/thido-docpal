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
  return validDay(date) ? new Intl.DateTimeFormat("en", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`)) : "Choose a date";
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
