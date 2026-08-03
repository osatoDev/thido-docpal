import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import type { Extensions } from "@tiptap/core";
import { CommentMark } from "@/components/editor/extensions/CommentMark";
import { StyledBulletList } from "@/components/editor/extensions/StyledBulletList";
import { isSafeDocumentLink } from "@/lib/documentLinks";

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
      bulletList: false,
      link: {
        autolink: true,
        enableClickSelection: true,
        linkOnPaste: true,
        openOnClick: false,
        HTMLAttributes: {
          target: "_blank",
          rel: "noopener noreferrer",
        },
        isAllowedUri: (url, { defaultValidate }) =>
          defaultValidate(url) && isSafeDocumentLink(url),
        shouldAutoLink: isSafeDocumentLink,
      },
    }),
    StyledBulletList,
    TaskList,
    TaskItem.configure({
      nested: true,
      a11y: {
        checkboxLabel: (node, checked) =>
          `${checked ? "Mark incomplete" : "Mark complete"}: ${node.textContent || "empty task"}`,
      },
    }),
    TableKit.configure({
      table: {
        allowTableNodeSelection: true,
        renderWrapper: true,
        resizable: true,
      },
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
