import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import type { Extensions } from "@tiptap/core";
import { CommentMark } from "@/components/editor/extensions/CommentMark";

/**
 * Shared extension list used by both the client-side editor and the
 * server-side Markdown -> ProseMirror JSON conversion (AI document
 * generation) — they must stay in sync so generated content renders
 * identically to what the editor itself would produce. AI-generated
 * Markdown never contains comment marks, but including CommentMark here
 * keeps the schema identical either way.
 */
export function getEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      link: false,
    }),
    Placeholder.configure({
      placeholder: "Start writing…",
    }),
    Image.configure({
      allowBase64: false,
      inline: false,
    }),
    CommentMark,
  ];
}
