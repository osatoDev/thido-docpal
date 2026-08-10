import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Highlight from "@tiptap/extension-highlight";
import { TableKit } from "@tiptap/extension-table";
import { TaskItem } from "@tiptap/extension-list";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import TextAlign from "@tiptap/extension-text-align";
import type { Extensions } from "@tiptap/core";
import {
  Bookmark,
  Bookmarks,
} from "@/components/editor/extensions/Bookmarks";
import { BlockOperations } from "@/components/editor/extensions/BlockOperations";
import { CommentMark } from "@/components/editor/extensions/CommentMark";
import {
  DocumentPreferences,
  DocumentPreferencesNode,
} from "@/components/editor/extensions/DocumentPreferences";
import {
  Footnote,
  FootnoteReference,
  Footnotes,
} from "@/components/editor/extensions/Footnotes";
import { HeadingAnchors } from "@/components/editor/extensions/HeadingAnchors";
import { GoogleDocsPaste } from "@/components/editor/extensions/GoogleDocsPaste";
import { DocumentNavigation } from "@/components/editor/extensions/DocumentNavigation";
import { PageBreak } from "@/components/editor/extensions/PageBreak";
import {
  FormattedHeading,
  FormattedParagraph,
  ParagraphFormatting,
} from "@/components/editor/extensions/ParagraphFormatting";
import { RichTextStyle } from "@/components/editor/extensions/RichTextStyle";
import { StyledBulletList } from "@/components/editor/extensions/StyledBulletList";
import { StyledTaskList } from "@/components/editor/extensions/StyledTaskList";
import { TextCase } from "@/components/editor/extensions/TextCase";
import { TextCleanup } from "@/components/editor/extensions/TextCleanup";
import { TextIndent } from "@/components/editor/extensions/TextIndent";
import {
  TableOfContents,
  TableOfContentsCommands,
} from "@/components/editor/extensions/TableOfContents";
import { isSafeDocumentLink } from "@/lib/documentLinks";

const ExclusiveSuperscript = Superscript.extend({
  excludes: "subscript",
});
const ExclusiveSubscript = Subscript.extend({
  excludes: "superscript",
});

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
      heading: false,
      paragraph: false,
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
    FormattedParagraph,
    FormattedHeading.configure({ levels: [1, 2, 3, 4, 5, 6] }),
    GoogleDocsPaste,
    HeadingAnchors,
    DocumentNavigation,
    BlockOperations,
    Bookmark,
    Bookmarks,
    DocumentPreferencesNode,
    DocumentPreferences,
    TableOfContents,
    TableOfContentsCommands,
    FootnoteReference,
    Footnote,
    Footnotes,
    StyledBulletList,
    StyledTaskList,
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
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    Highlight.configure({ multicolor: true }),
    ExclusiveSuperscript,
    ExclusiveSubscript,
    RichTextStyle,
    ParagraphFormatting,
    TextCase,
    TextCleanup,
    TextIndent,
    PageBreak,
    CommentMark,
  ];
}
