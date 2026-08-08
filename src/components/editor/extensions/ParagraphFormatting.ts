import { Extension, type CommandProps } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";

const FORMATTABLE_NODES = new Set(["paragraph", "heading"]);
export const LINE_HEIGHT_OPTIONS = [1, 1.15, 1.5, 2] as const;
const MAX_PARAGRAPH_SPACE = 3;

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphFormatting: {
      setParagraphLineHeight: (lineHeight: number | null) => ReturnType;
      setParagraphSpaceBefore: (spaceBefore: number | null) => ReturnType;
      setParagraphSpaceAfter: (spaceAfter: number | null) => ReturnType;
    };
  }
}

function normalizeLineHeight(value: unknown) {
  const lineHeight = Number(value);
  return LINE_HEIGHT_OPTIONS.includes(
    lineHeight as (typeof LINE_HEIGHT_OPTIONS)[number],
  )
    ? lineHeight
    : null;
}

function normalizeParagraphSpace(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const space = Number(value);
  return Number.isFinite(space)
    ? Math.min(MAX_PARAGRAPH_SPACE, Math.max(0, space))
    : null;
}

function updateSelectedBlocks(
  attribute: "lineHeight" | "spaceBefore" | "spaceAfter",
  value: number | null,
) {
  return ({ state, tr, dispatch }: CommandProps) => {
    const positions = new Set<number>();
    const { from, to, $from } = state.selection;

    state.doc.nodesBetween(from, to, (node, position) => {
      if (FORMATTABLE_NODES.has(node.type.name)) positions.add(position);
    });

    if (positions.size === 0) {
      for (let depth = $from.depth; depth > 0; depth -= 1) {
        if (FORMATTABLE_NODES.has($from.node(depth).type.name)) {
          positions.add($from.before(depth));
          break;
        }
      }
    }

    let changed = false;
    for (const position of positions) {
      const node = tr.doc.nodeAt(position);
      if (!node || node.attrs[attribute] === value) continue;
      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        [attribute]: value,
      });
      changed = true;
    }

    if (changed && dispatch) dispatch(tr);
    return changed;
  };
}

function formattingAttributes() {
  return {
    lineHeight: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        normalizeLineHeight(element.style.lineHeight),
      renderHTML: (attributes: Record<string, unknown>) => {
        const lineHeight = normalizeLineHeight(attributes.lineHeight);
        return lineHeight ? { style: `line-height: ${lineHeight}` } : {};
      },
    },
    spaceBefore: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        normalizeParagraphSpace(element.style.marginTop.replace("rem", "")),
      renderHTML: (attributes: Record<string, unknown>) => {
        const space = normalizeParagraphSpace(attributes.spaceBefore);
        return space === null ? {} : { style: `margin-top: ${space}rem` };
      },
    },
    spaceAfter: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        normalizeParagraphSpace(element.style.marginBottom.replace("rem", "")),
      renderHTML: (attributes: Record<string, unknown>) => {
        const space = normalizeParagraphSpace(attributes.spaceAfter);
        return space === null ? {} : { style: `margin-bottom: ${space}rem` };
      },
    },
  };
}

export const FormattedParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...formattingAttributes(),
    };
  },
});

export const FormattedHeading = Heading.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...formattingAttributes(),
      headingId: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const headingId = element.getAttribute("id");
          return headingId && /^[a-z][a-z0-9-]{0,99}$/.test(headingId)
            ? headingId
            : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const headingId = String(attributes.headingId ?? "");
          return /^[a-z][a-z0-9-]{0,99}$/.test(headingId)
            ? { id: headingId }
            : {};
        },
      },
    };
  },
});

export const ParagraphFormatting = Extension.create({
  name: "paragraphFormatting",

  addCommands() {
    return {
      setParagraphLineHeight: (lineHeight) =>
        updateSelectedBlocks("lineHeight", normalizeLineHeight(lineHeight)),
      setParagraphSpaceBefore: (spaceBefore) =>
        updateSelectedBlocks(
          "spaceBefore",
          normalizeParagraphSpace(spaceBefore),
        ),
      setParagraphSpaceAfter: (spaceAfter) =>
        updateSelectedBlocks("spaceAfter", normalizeParagraphSpace(spaceAfter)),
    };
  },
});
