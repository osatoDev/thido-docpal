import { getSchema, type JSONContent } from "@tiptap/core";

import { getEditorExtensions } from "@/lib/editorExtensions";
import { countText, getDocumentText } from "@/lib/editorText";

const documentSchema = getSchema(getEditorExtensions());

export function countDocumentWords(content: unknown) {
  if (!content || typeof content !== "object") return 0;

  try {
    const document = documentSchema.nodeFromJSON(content as JSONContent);
    return countText(getDocumentText(document)).words;
  } catch {
    return 0;
  }
}
