import { marked } from "marked";
import { generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/react";
import { getEditorExtensions } from "@/lib/editorExtensions";

/**
 * Converts AI-generated Markdown into the same ProseMirror JSON shape the
 * editor uses. Uses `@tiptap/html/server` (backed by happy-dom) rather than
 * `@tiptap/core`'s `generateJSON`, which requires a browser `window` and
 * throws in the Node.js route handler runtime.
 */
export async function markdownToTiptapJSON(markdown: string): Promise<JSONContent> {
  const html = await marked.parse(markdown);
  return generateJSON(html, getEditorExtensions()) as JSONContent;
}
