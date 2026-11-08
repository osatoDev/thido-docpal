import type { Node as ProseMirrorNode, Schema } from "@tiptap/pm/model";
import { EditorState, TextSelection, type Transaction } from "@tiptap/pm/state";
import { validDay } from "@/lib/documentDays";

/** Top-level blocks that sit after the writing and must stay last. */
const TRAILING_NODE_TYPES = new Set(["footnote", "documentPreferences", "planProjects"]);
const TIME_PREFIX = /^([01]\d|2[0-3]):([0-5]\d)\b/;

export type ScheduledTask = { date: string; time: string | null; task: string };

type TopLevelBlock = { node: ProseMirrorNode; pos: number };

function topLevelBlocks(doc: ProseMirrorNode): TopLevelBlock[] {
  const blocks: TopLevelBlock[] = [];
  doc.forEach((node, offset) => blocks.push({ node, pos: offset }));
  return blocks;
}

/** End of the writable body: before footnotes/preferences that close the document. */
function bodyEnd(blocks: TopLevelBlock[], doc: ProseMirrorNode) {
  let end = doc.content.size;
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (!TRAILING_NODE_TYPES.has(blocks[index].node.type.name)) break;
    end = blocks[index].pos;
  }
  return end;
}

function isDay(block: TopLevelBlock) {
  return block.node.type.name === "dayHeader" && validDay(block.node.attrs.date);
}

/** "15:00 Dentist" keeps the time visible in the list and parseable for future reminders. */
export function scheduledTaskText({ time, task }: Pick<ScheduledTask, "time" | "task">) {
  const clean = task.trim().replace(/\s+/g, " ");
  return time && TIME_PREFIX.test(time) ? `${time} ${clean}` : clean;
}

export function taskTime(text: string): string | null {
  const match = TIME_PREFIX.exec(text.trim());
  return match ? `${match[1]}:${match[2]}` : null;
}

function taskItemNode(schema: Schema, text: string) {
  return schema.nodes.taskItem.create(
    { checked: false },
    schema.nodes.paragraph.create(null, schema.text(text)),
  );
}

/**
 * The blocks that belong to a day: from its header up to the next day header
 * (in document order) or the end of the body.
 */
export function daySection(doc: ProseMirrorNode, date: string) {
  const blocks = topLevelBlocks(doc);
  const end = bodyEnd(blocks, doc);
  const index = blocks.findIndex(block => isDay(block) && block.node.attrs.date === date);
  if (index === -1) return null;
  const members: TopLevelBlock[] = [];
  for (let next = index + 1; next < blocks.length; next += 1) {
    const block = blocks[next];
    if (block.pos >= end || isDay(block)) break;
    members.push(block);
  }
  return { header: blocks[index], members };
}

/**
 * Builds a transaction that writes an unchecked task under the given day,
 * creating the day header in date order when it does not exist yet. Returns
 * null when the schema cannot hold tasks or the date is invalid.
 */
export function insertScheduledTask(state: EditorState, entry: ScheduledTask): Transaction | null {
  const { schema } = state;
  if (!schema.nodes.taskItem) return null;
  const text = scheduledTaskText(entry);
  if (!text) return null;
  return insertTaskItem(state, entry.date, taskItemNode(schema, text));
}

/** Writes a task item, with any subtasks, under a day, in time order. */
function insertTaskItem(state: EditorState, date: string, item: ProseMirrorNode): Transaction | null {
  const { schema, doc } = state;
  if (!validDay(date) || !schema.nodes.taskList || !schema.nodes.dayHeader) return null;
  const tr = state.tr;
  const time = taskTime(item.firstChild?.textContent ?? "");
  const section = daySection(doc, date);

  let cursor: number;
  if (section) {
    const filled = section.members.filter(block => block.node.textContent.trim() || block.node.type.name !== "paragraph");
    const lastFilled = filled.at(-1);
    if (lastFilled?.node.type.name === "taskList") {
      // Keep timed tasks in time order; untimed tasks go to the end of the list.
      let insertAt = lastFilled.pos + lastFilled.node.nodeSize - 1;
      if (time) {
        let offset = lastFilled.pos + 1;
        for (let index = 0; index < lastFilled.node.childCount; index += 1) {
          const child = lastFilled.node.child(index);
          const childTime = taskTime(child.textContent);
          if (childTime && childTime > time) { insertAt = offset; break; }
          offset += child.nodeSize;
        }
      }
      tr.insert(insertAt, item);
      cursor = insertAt + item.nodeSize - 1;
    } else {
      const after = lastFilled ?? section.header;
      const insertAt = after.pos + after.node.nodeSize;
      tr.insert(insertAt, schema.nodes.taskList.create(null, item));
      cursor = insertAt + item.nodeSize;
    }
  } else {
    const blocks = topLevelBlocks(doc);
    const end = bodyEnd(blocks, doc);
    const later = blocks.find(block => block.pos < end && isDay(block) && block.node.attrs.date > date);
    const insertAt = later ? later.pos : end;
    const header = schema.nodes.dayHeader.create({ date });
    const list = schema.nodes.taskList.create(null, item);
    const spacer = schema.nodes.paragraph.create();
    tr.insert(insertAt, later ? [header, list, spacer] : [header, list]);
    cursor = insertAt + header.nodeSize + item.nodeSize;
  }
  const resolved = Math.min(Math.max(cursor - 1, 0), tr.doc.content.size);
  tr.setSelection(TextSelection.near(tr.doc.resolve(resolved)));
  return tr.scrollIntoView();
}

/** Plain-text view of a day's plan, used as context for AI feedback. */
export function dayPlanText(doc: ProseMirrorNode, date: string): string | null {
  const section = daySection(doc, date);
  if (!section) return null;
  const lines: string[] = [];
  if (section.header.node.textContent.trim()) lines.push(`Day note: ${section.header.node.textContent.trim()}`);
  const walk = (node: ProseMirrorNode, depth: number) => {
    node.forEach(child => {
      if (child.type.name === "taskItem" || child.type.name === "listItem") {
        const own = child.firstChild?.textContent.trim() ?? "";
        const mark = child.type.name === "taskItem" ? (child.attrs.checked ? "[x] " : "[ ] ") : "- ";
        if (own) lines.push(`${"  ".repeat(depth)}${mark}${own}`);
        child.forEach((grandchild, _offset, index) => { if (index > 0) walk(grandchild, depth + 1); });
      } else if (child.isTextblock) {
        if (child.textContent.trim()) lines.push(`${"  ".repeat(depth)}${child.textContent.trim()}`);
      } else {
        walk(child, depth);
      }
    });
  };
  section.members.forEach(block => {
    if (block.node.isTextblock) {
      if (block.node.textContent.trim()) lines.push(block.node.textContent.trim());
    } else walk(block.node, 0);
  });
  return lines.join("\n");
}

/** The day whose section contains `position`, if any. */
export function dayAtPosition(doc: ProseMirrorNode, position: number): string | null {
  let current: string | null = null;
  for (const block of topLevelBlocks(doc)) {
    if (block.pos > position) break;
    if (isDay(block)) current = block.node.attrs.date;
  }
  return current;
}

/**
 * Moves the task item at `position`, with its subtasks and checked state, to
 * another day as one undoable step. Its old list goes if it was the last item.
 */
export function moveTaskToDay(state: EditorState, position: number, date: string): Transaction | null {
  const item = state.doc.nodeAt(position);
  if (item?.type.name !== "taskItem" || !validDay(date)) return null;
  const $item = state.doc.resolve(position);
  if ($item.parent.type.name !== "taskList") return null;
  const tr = state.tr;
  if ($item.parent.childCount === 1) {
    const listStart = $item.before($item.depth);
    tr.delete(listStart, listStart + $item.parent.nodeSize);
  } else {
    tr.delete(position, position + item.nodeSize);
  }
  const removed = EditorState.create({ doc: tr.doc, schema: state.schema });
  const insert = insertTaskItem(removed, date, item);
  if (!insert) return null;
  insert.steps.forEach(step => tr.step(step));
  tr.setSelection(TextSelection.near(tr.doc.resolve(Math.min(insert.selection.from, tr.doc.content.size))));
  return tr.scrollIntoView();
}
