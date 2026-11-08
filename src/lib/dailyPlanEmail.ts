import { validDay } from "@/lib/documentDays";
import { isTimeZone } from "@/lib/planFeedbackPolicy";

/**
 * Pure helpers for the morning email: which day it is for someone, and what
 * their plan says for today and yesterday. They read the stored Tiptap JSON
 * directly, so the cron job needs no editor.
 */

type JsonNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

export type DailyPlanLine = { text: string; checked: boolean | null; depth: number };

export type DailyPlanSummary = {
  today: DailyPlanLine[];
  doneYesterday: DailyPlanLine[];
};

/** The calendar day (YYYY-MM-DD) at `now` in a time zone, UTC if it's unknown. */
export function localDay(now: Date, timeZone: string | null | undefined) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: isTimeZone(timeZone) ? timeZone : "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function previousDay(day: string) {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}

function plainText(node: JsonNode): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return " ";
  return (node.content ?? []).map(plainText).join("");
}

function clean(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

/** Lines under one day: tasks with their tick, bullets and notes without. */
function sectionLines(blocks: JsonNode[]) {
  const lines: DailyPlanLine[] = [];
  const walk = (node: JsonNode, depth: number) => {
    if (node.type === "taskItem" || node.type === "listItem") {
      const [first, ...rest] = node.content ?? [];
      const text = first ? clean(plainText(first)) : "";
      if (text) lines.push({ text, checked: node.type === "taskItem" ? node.attrs?.checked === true : null, depth });
      rest.forEach(child => walk(child, depth + 1));
      return;
    }
    if (node.type === "paragraph" || node.type === "heading") {
      const text = clean(plainText(node));
      if (text) lines.push({ text, checked: null, depth });
      return;
    }
    (node.content ?? []).forEach(child => walk(child, depth));
  };
  blocks.forEach(block => walk(block, 0));
  return lines;
}

/** What the plan holds for `today`, and the tasks ticked off the day before. */
export function dailyPlanSummary(content: unknown, today: string): DailyPlanSummary {
  const yesterday = previousDay(today);
  const sections = new Map<string, JsonNode[]>();
  let current: JsonNode[] | null = null;
  const blocks = (content as JsonNode | null)?.content ?? [];
  for (const block of blocks) {
    if (block.type === "dayHeader") {
      const date = block.attrs?.date;
      current = null;
      if (!validDay(date)) continue;
      // The same day can appear twice; both parts count.
      current = sections.get(date) ?? [];
      sections.set(date, current);
      const note = clean(plainText(block));
      if (note) current.push({ type: "paragraph", content: [{ type: "text", text: note }] });
      continue;
    }
    if (block.type === "footnote" || block.type === "documentPreferences") continue;
    current?.push(block);
  }
  return {
    today: sectionLines(sections.get(today) ?? []),
    // A ticked subtask stands on its own here, even if its parent is still open.
    doneYesterday: sectionLines(sections.get(yesterday) ?? [])
      .filter(line => line.checked === true)
      .map(line => ({ ...line, depth: 0 })),
  };
}
