import { marked } from "marked";
import { generateJSON } from "@tiptap/html/server";
import type { JSONContent } from "@tiptap/react";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { sanitizeImportedDocumentHtml } from "@/lib/documentImport";

/**
 * Converts AI-generated Markdown into the same ProseMirror JSON shape the
 * editor uses. Uses `@tiptap/html/server` (backed by happy-dom) rather than
 * `@tiptap/core`'s `generateJSON`, which requires a browser `window` and
 * throws in the Node.js route handler runtime.
 */
export async function markdownToTiptapJSON(
  markdown: string,
  { sanitize = false }: { sanitize?: boolean } = {},
): Promise<JSONContent> {
  const parsedHtml = await marked.parse(markdown);
  const html = sanitize
    ? sanitizeImportedDocumentHtml(parsedHtml)
    : parsedHtml;
  return generateJSON(html, getEditorExtensions()) as JSONContent;
}

/**
 * Whole-document AI rewrites operate on user-visible Markdown, so editor-only
 * preferences are carried forward explicitly instead of being silently reset.
 */
export function preserveDocumentPreferences(
  currentContent: JSONContent | null,
  replacementContent: JSONContent,
): JSONContent {
  const preferences = currentContent?.content?.find(
    (node) => node.type === "documentPreferences",
  );
  if (!preferences) return replacementContent;

  return {
    ...replacementContent,
    content: [
      preferences,
      ...(replacementContent.content ?? []).filter(
        (node) => node.type !== "documentPreferences",
      ),
    ],
  };
}
