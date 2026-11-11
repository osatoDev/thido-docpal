import { validDay } from "@/lib/documentDays";
import { isTimeZone } from "@/lib/timeZone";

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
    // A project's list is not on any day.
    if (block.type === "projectHeader") { current = null; continue; }
    if (block.type === "footnote" || block.type === "documentPreferences" || block.type === "planProjects") continue;
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

function dailyLineMark(line: DailyPlanLine) {
  return line.checked === null ? "- " : line.checked ? "[x] " : "[ ] ";
}

function weekday(day: string) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

function dayLabel(day: string, today: string) {
  if (day === today) return "today";
  if (day === previousDay(today)) return "yesterday";
  return day < today ? "past" : "upcoming";
}

/**
 * The whole plan as plain text for the morning email's AI notes: every day in
 * date order, marked past, yesterday, today or upcoming, then each project's
 * list, which is not tied to a day.
 */
export function planContextText(content: unknown, today: string): string {
  const days = new Map<string, JsonNode[]>();
  const projects: { name: string; blocks: JsonNode[] }[] = [];
  const loose: JsonNode[] = [];
  let current: JsonNode[] | null = loose;
  for (const block of (content as JsonNode | null)?.content ?? []) {
    if (block.type === "dayHeader") {
      const date = block.attrs?.date;
      current = null;
      if (!validDay(date)) continue;
      current = days.get(date) ?? [];
      days.set(date, current);
      const note = clean(plainText(block));
      if (note) current.push({ type: "paragraph", content: [{ type: "text", text: `Note: ${note}` }] });
      continue;
    }
    if (block.type === "projectHeader") {
      current = [];
      projects.push({ name: clean(plainText(block)) || "Untitled project", blocks: current });
      continue;
    }
    if (block.type === "footnote" || block.type === "documentPreferences" || block.type === "planProjects") continue;
    current?.push(block);
  }
  const render = (blocks: JsonNode[]) => {
    const lines = sectionLines(blocks);
    return lines.length
      ? lines.map(line => `${"  ".repeat(line.depth + 1)}${dailyLineMark(line)}${line.text}`).join("\n")
      : "  (nothing listed)";
  };
  const parts: string[] = [];
  const looseLines = sectionLines(loose);
  if (looseLines.length) parts.push(`Notes outside any day:\n${render(loose)}`);
  // Today is always listed, even when the plan has nothing for it.
  for (const day of [...new Set([...days.keys(), today])].sort()) {
    parts.push(`Day ${day} (${weekday(day)}, ${dayLabel(day, today)}):\n${render(days.get(day) ?? [])}`);
  }
  for (const project of projects) parts.push(`Project "${project.name}" (no day):\n${render(project.blocks)}`);
  return parts.join("\n\n");
}
