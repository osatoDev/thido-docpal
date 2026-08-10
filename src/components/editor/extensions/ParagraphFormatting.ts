import { Extension, type CommandProps } from "@tiptap/core";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";

const FORMATTABLE_NODES = new Set(["paragraph", "heading"]);
export const LINE_HEIGHT_OPTIONS = [1, 1.15, 1.5, 2] as const;
const MAX_PARAGRAPH_SPACE = 6;

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
  return Number.isFinite(lineHeight) && lineHeight >= 0.8 && lineHeight <= 3
    ? Math.round(lineHeight * 100) / 100
    : null;
}

function normalizeParagraphSpace(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const space = Number(value);
  return Number.isFinite(space)
    ? Math.round(
        Math.min(MAX_PARAGRAPH_SPACE, Math.max(0, space)) * 100,
      ) / 100
    : null;
}

function parseParagraphSpace(value: string) {
  const match = /^(-?\d+(?:\.\d+)?)(rem|em|px|pt)?$/i.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const unit = match[2]?.toLowerCase();
  const rem = unit === "px" ? amount / 16 : unit === "pt" ? amount / 12 : amount;
  return normalizeParagraphSpace(rem);
}

function parseLineHeight(value: string) {
  const normalized = value.trim();
  if (normalized.endsWith("%")) {
    return normalizeLineHeight(Number(normalized.slice(0, -1)) / 100);
  }
  return normalizeLineHeight(normalized);
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
        parseLineHeight(element.style.lineHeight),
      renderHTML: (attributes: Record<string, unknown>) => {
        const lineHeight = normalizeLineHeight(attributes.lineHeight);
        return lineHeight ? { style: `line-height: ${lineHeight}` } : {};
      },
    },
    spaceBefore: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        parseParagraphSpace(element.style.marginTop),
      renderHTML: (attributes: Record<string, unknown>) => {
        const space = normalizeParagraphSpace(attributes.spaceBefore);
        return space === null ? {} : { style: `margin-top: ${space}rem` };
      },
    },
    spaceAfter: {
      default: null,
      parseHTML: (element: HTMLElement) =>
        parseParagraphSpace(element.style.marginBottom),
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
      outlineHidden: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-outline-hidden") === "true",
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes.outlineHidden === true
            ? { "data-outline-hidden": "true" }
            : {},
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
