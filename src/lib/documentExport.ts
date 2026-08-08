import {
  AlignmentType,
  Document as WordDocument,
  ExternalHyperlink,
  HeadingLevel,
  HighlightColor,
  ImageRun,
  LevelFormat,
  Packer,
  PageBreak as WordPageBreak,
  Paragraph,
  Table as WordTable,
  TableCell as WordTableCell,
  TableRow as WordTableRow,
  TextRun,
  WidthType,
  type ParagraphChild,
} from "docx";
import PDFDocument from "pdfkit";
import type { JSONContent } from "@tiptap/react";

import { loadDocumentImageAsPng } from "@/lib/documentFileImages";
import { isBulletStyle, type BulletStyle } from "@/components/editor/extensions/StyledBulletList";
import { isSafeDocumentLink } from "@/lib/documentLinks";

const bulletGlyphs: Record<BulletStyle, string> = {
  disc: "•",
  circle: "○",
  square: "▪",
};

function textRuns(node: JSONContent, forceCode = false): ParagraphChild[] {
  if (node.type === "hardBreak") return [new TextRun({ break: 1 })];
  if (node.type === "text") {
    const markTypes = new Set(node.marks?.map((mark) => mark.type));
    const href = node.marks?.find((mark) => mark.type === "link")?.attrs?.href;
    const run = new TextRun({
      text: node.text ?? "",
      bold: markTypes.has("bold"),
      italics: markTypes.has("italic"),
      strike: markTypes.has("strike"),
      font: forceCode || markTypes.has("code") ? "Courier New" : undefined,
      color: markTypes.has("link") ? "1A5FB4" : undefined,
      underline:
        markTypes.has("link") || markTypes.has("underline") ? {} : undefined,
      highlight: markTypes.has("highlight")
        ? HighlightColor.YELLOW
        : undefined,
      subScript: markTypes.has("subscript"),
      superScript: markTypes.has("superscript"),
    });
    return typeof href === "string" && isSafeDocumentLink(href)
      ? [new ExternalHyperlink({ link: href, children: [run] })]
      : [run];
  }
  return node.content?.flatMap((child) => textRuns(child, forceCode)) ?? [];
}

function headingLevel(level: unknown) {
  if (level === 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  if (level === 3) return HeadingLevel.HEADING_3;
  return undefined;
}

function wordAlignment(value: unknown) {
  if (value === "center") return AlignmentType.CENTER;
  if (value === "right") return AlignmentType.RIGHT;
  if (value === "justify") return AlignmentType.JUSTIFIED;
  return value === "left" ? AlignmentType.LEFT : undefined;
}

async function wordParagraph(
  documentId: string,
  node: JSONContent,
  options: {
    numbering?: { reference: string; level: number };
    blockquote?: boolean;
    prefix?: ParagraphChild[];
  } = {},
) {
  const children: ParagraphChild[] = [...(options.prefix ?? [])];
  for (const child of node.content ?? []) {
    if (child.type === "image") {
      const image = await loadDocumentImageAsPng(documentId, child.attrs?.src);
      if (image) {
        const scale = Math.min(1, 560 / image.width);
        children.push(
          new ImageRun({
            data: image.data,
            type: "png",
            transformation: {
              width: Math.round(image.width * scale),
              height: Math.round(image.height * scale),
            },
            altText: image.alt
              ? { title: image.alt, description: image.alt, name: image.alt }
              : undefined,
          }),
        );
      }
    } else {
      children.push(...textRuns(child, node.type === "codeBlock"));
    }
  }

  const textIndent = Math.min(
    8,
    Math.max(0, Number(node.attrs?.textIndent) || 0),
  );
  const leftIndent = (options.blockquote ? 720 : 0) + textIndent * 480;

  return new Paragraph({
    children,
    heading:
      node.type === "heading" ? headingLevel(node.attrs?.level) : undefined,
    alignment: wordAlignment(node.attrs?.textAlign),
    numbering: options.numbering,
    indent: leftIndent > 0 ? { left: leftIndent } : undefined,
    spacing: { after: node.type === "heading" ? 160 : 120 },
  });
}

type WordBlock = Paragraph | WordTable;

async function wordTable(documentId: string, node: JSONContent) {
  const rows: WordTableRow[] = [];
  for (const row of node.content ?? []) {
    const cells: WordTableCell[] = [];
    for (const cell of row.content ?? []) {
      const children = await wordBlocks(documentId, cell.content ?? []);
      cells.push(
        new WordTableCell({
          children: children.length > 0 ? children : [new Paragraph("")],
          columnSpan: Math.max(1, Number(cell.attrs?.colspan) || 1),
          rowSpan: Math.max(1, Number(cell.attrs?.rowspan) || 1),
          shading:
            cell.type === "tableHeader" ? { fill: "E9ECE9" } : undefined,
        }),
      );
    }
    rows.push(new WordTableRow({ children: cells }));
  }
  return new WordTable({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

async function wordBlocks(
  documentId: string,
  nodes: JSONContent[],
  level = 0,
): Promise<WordBlock[]> {
  const paragraphs: WordBlock[] = [];
  for (const node of nodes) {
    if (node.type === "table") {
      paragraphs.push(await wordTable(documentId, node));
      continue;
    }
    if (node.type === "taskList") {
      for (const item of node.content ?? []) {
        let firstParagraph = true;
        for (const child of item.content ?? []) {
          if (child.type === "taskList") {
            paragraphs.push(
              ...(await wordBlocks(documentId, [child], level + 1)),
            );
          } else {
            paragraphs.push(
              await wordParagraph(documentId, child, {
                prefix: firstParagraph
                  ? [new TextRun({ text: item.attrs?.checked ? "☒ " : "☐ " })]
                  : undefined,
              }),
            );
            firstParagraph = false;
          }
        }
      }
      continue;
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      const style = isBulletStyle(node.attrs?.bulletStyle)
        ? node.attrs.bulletStyle
        : "disc";
      const reference =
        node.type === "orderedList" ? "thido-ordered" : `thido-${style}`;
      for (const item of node.content ?? []) {
        let firstParagraph = true;
        for (const child of item.content ?? []) {
          if (child.type === "bulletList" || child.type === "orderedList") {
            paragraphs.push(
              ...(await wordBlocks(documentId, [child], level + 1)),
            );
          } else {
            paragraphs.push(
              await wordParagraph(documentId, child, {
                numbering: firstParagraph
                  ? { reference, level: Math.min(level, 8) }
                  : undefined,
              }),
            );
            firstParagraph = false;
          }
        }
      }
      continue;
    }
    if (node.type === "blockquote") {
      for (const child of node.content ?? []) {
        paragraphs.push(
          await wordParagraph(documentId, child, { blockquote: true }),
        );
      }
      continue;
    }
    if (node.type === "horizontalRule") {
      paragraphs.push(new Paragraph({ text: "────────────────────" }));
      continue;
    }
    if (node.type === "pageBreak") {
      paragraphs.push(
        new Paragraph({ children: [new WordPageBreak()], spacing: { after: 0 } }),
      );
      continue;
    }
    if (node.type === "image") {
      paragraphs.push(
        await wordParagraph(documentId, { type: "paragraph", content: [node] }),
      );
      continue;
    }
    paragraphs.push(await wordParagraph(documentId, node));
  }
  return paragraphs;
}

function numberingLevels(format: "bullet" | "decimal", glyph?: string) {
  return Array.from({ length: 9 }, (_, level) => ({
    level,
    format: format === "bullet" ? LevelFormat.BULLET : LevelFormat.DECIMAL,
    text: format === "bullet" ? glyph! : `%${level + 1}.`,
    alignment: AlignmentType.LEFT,
    style: {
      paragraph: {
        indent: { left: 720 + level * 360, hanging: 360 },
      },
    },
  }));
}

export async function createWordDocument({
  documentId,
  title,
  content,
}: {
  documentId: string;
  title: string;
  content: JSONContent | null;
}) {
  const children = [
    ...(content?.content
      ? await wordBlocks(documentId, content.content)
      : [new Paragraph({ text: "" })]),
  ];
  const document = new WordDocument({
    title,
    creator: "Thido",
    numbering: {
      config: [
        {
          reference: "thido-ordered",
          levels: numberingLevels("decimal"),
        },
        ...Object.entries(bulletGlyphs).map(([style, glyph]) => ({
          reference: `thido-${style}`,
          levels: numberingLevels("bullet", glyph),
        })),
      ],
    },
    sections: [{ children }],
  });
  return Packer.toBuffer(document);
}

type PdfRun = {
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
  strike: boolean;
  underline: boolean;
  href?: string;
};

function pdfRuns(node: JSONContent, forceCode = false): PdfRun[] {
  if (node.type === "hardBreak") {
    return [
      {
        text: "\n",
        bold: false,
        italic: false,
        code: forceCode,
        strike: false,
        underline: false,
      },
    ];
  }
  if (node.type === "text") {
    const marks = new Set(node.marks?.map((mark) => mark.type));
    const linkHref = node.marks?.find((mark) => mark.type === "link")?.attrs
      ?.href;
    return [
      {
        text: node.text ?? "",
        bold: marks.has("bold"),
        italic: marks.has("italic"),
        code: forceCode || marks.has("code"),
        strike: marks.has("strike"),
        underline: marks.has("underline"),
        href:
          typeof linkHref === "string" && isSafeDocumentLink(linkHref)
            ? linkHref
            : undefined,
      },
    ];
  }
  return node.content?.flatMap((child) => pdfRuns(child, forceCode)) ?? [];
}

function pdfFont(run: PdfRun) {
  if (run.code) {
    if (run.bold && run.italic) return "Courier-BoldOblique";
    if (run.bold) return "Courier-Bold";
    if (run.italic) return "Courier-Oblique";
    return "Courier";
  }
  if (run.bold && run.italic) return "Times-BoldItalic";
  if (run.bold) return "Times-Bold";
  if (run.italic) return "Times-Italic";
  return "Times-Roman";
}

function renderPdfRuns(
  pdf: PDFKit.PDFDocument,
  runs: PdfRun[],
  options: PDFKit.Mixins.TextOptions = {},
) {
  if (runs.length === 0) {
    pdf.text(" ", options);
    return;
  }
  runs.forEach((run, index) => {
    pdf
      .font(pdfFont(run))
      .fillColor(run.href ? "#1a5fb4" : "#161916")
      .text(run.text, {
        ...options,
        continued: index < runs.length - 1,
        link: run.href,
        strike: run.strike,
        underline: Boolean(run.href) || run.underline,
      });
  });
  pdf.fillColor("#161916");
}

function pdfBlockOptions(node: JSONContent) {
  const alignment = node.attrs?.textAlign;
  const textIndent = Math.min(
    8,
    Math.max(0, Number(node.attrs?.textIndent) || 0),
  );
  return {
    align:
      alignment === "left" ||
      alignment === "center" ||
      alignment === "right" ||
      alignment === "justify"
        ? alignment
        : undefined,
    indent: textIndent > 0 ? textIndent * 24 : undefined,
  } satisfies PDFKit.Mixins.TextOptions;
}

function plainText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return node.content?.map(plainText).join("") ?? "";
}

function ensurePdfSpace(pdf: PDFKit.PDFDocument, height: number) {
  if (pdf.y + height > pdf.page.height - pdf.page.margins.bottom) {
    pdf.addPage();
  }
}

function renderPdfTable(pdf: PDFKit.PDFDocument, node: JSONContent) {
  const rows = node.content ?? [];
  const columnCount = Math.max(
    1,
    ...rows.map((row) => row.content?.length ?? 0),
  );
  const tableWidth =
    pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
  const cellWidth = tableWidth / columnCount;

  for (const row of rows) {
    const cells = row.content ?? [];
    const texts = Array.from({ length: columnCount }, (_, index) =>
      plainText(cells[index] ?? {}).trim(),
    );
    const rowHeight = Math.max(
      28,
      ...texts.map(
        (text) =>
          pdf.heightOfString(text || " ", { width: cellWidth - 10 }) + 10,
      ),
    );
    ensurePdfSpace(pdf, rowHeight);
    const top = pdf.y;
    texts.forEach((text, index) => {
      const cell = cells[index];
      const left = pdf.page.margins.left + index * cellWidth;
      if (cell?.type === "tableHeader") {
        pdf.save().rect(left, top, cellWidth, rowHeight).fill("#e9ece9").restore();
      }
      pdf
        .rect(left, top, cellWidth, rowHeight)
        .strokeColor("#aeb3ae")
        .stroke();
      pdf
        .font(cell?.type === "tableHeader" ? "Times-Bold" : "Times-Roman")
        .fontSize(10)
        .fillColor("#161916")
        .text(text || " ", left + 5, top + 5, {
          width: cellWidth - 10,
          height: rowHeight - 10,
        });
    });
    pdf.y = top + rowHeight;
  }
  pdf.moveDown(0.75);
}

async function renderPdfBlocks(
  pdf: PDFKit.PDFDocument,
  documentId: string,
  nodes: JSONContent[],
  level = 0,
) {
  for (const node of nodes) {
    if (node.type === "table") {
      renderPdfTable(pdf, node);
      continue;
    }
    if (node.type === "taskList") {
      for (const item of node.content ?? []) {
        let first = true;
        for (const child of item.content ?? []) {
          if (child.type === "taskList") {
            await renderPdfBlocks(pdf, documentId, [child], level + 1);
          } else {
            pdf
              .font("Times-Roman")
              .fontSize(11)
              .text(
                first ? (item.attrs?.checked ? "[x] " : "[ ] ") : "",
                54 + level * 20,
                undefined,
                { continued: true },
              );
            renderPdfRuns(pdf, pdfRuns(child));
            pdf.moveDown(0.25);
            first = false;
          }
        }
      }
      continue;
    }
    if (node.type === "bulletList" || node.type === "orderedList") {
      const style = isBulletStyle(node.attrs?.bulletStyle)
        ? node.attrs.bulletStyle
        : "disc";
      let itemNumber = Number(node.attrs?.start) || 1;
      for (const item of node.content ?? []) {
        let first = true;
        for (const child of item.content ?? []) {
          if (child.type === "bulletList" || child.type === "orderedList") {
            await renderPdfBlocks(pdf, documentId, [child], level + 1);
          } else {
            const prefix = first
              ? node.type === "orderedList"
                ? `${itemNumber}. `
                : `${bulletGlyphs[style]} `
              : "";
            pdf.font("Times-Roman").fontSize(11).text(prefix, 54 + level * 20, undefined, {
              continued: true,
              indent: 0,
            });
            renderPdfRuns(pdf, pdfRuns(child), { indent: 0 });
            pdf.moveDown(0.25);
            first = false;
          }
        }
        itemNumber += 1;
      }
      continue;
    }
    if (node.type === "image") {
      const image = await loadDocumentImageAsPng(documentId, node.attrs?.src);
      if (image) {
        pdf.image(image.data, { fit: [500, 360], align: "center" });
        pdf.moveDown(0.75);
      }
      continue;
    }
    if (node.type === "heading") {
      const levelValue = Number(node.attrs?.level) || 1;
      pdf.fontSize(levelValue === 1 ? 20 : levelValue === 2 ? 16 : 13);
      renderPdfRuns(pdf, pdfRuns(node), pdfBlockOptions(node));
      pdf.moveDown(0.45);
      continue;
    }
    if (node.type === "blockquote") {
      for (const child of node.content ?? []) {
        pdf.fontSize(11).font("Times-Italic");
        const childOptions = pdfBlockOptions(child);
        renderPdfRuns(pdf, pdfRuns(child), {
          ...childOptions,
          indent: 22 + (childOptions.indent ?? 0),
        });
        pdf.moveDown(0.4);
      }
      continue;
    }
    if (node.type === "horizontalRule") {
      pdf
        .moveTo(54, pdf.y)
        .lineTo(pdf.page.width - 54, pdf.y)
        .strokeColor("#aaaaaa")
        .stroke();
      pdf.moveDown(0.8);
      continue;
    }
    if (node.type === "pageBreak") {
      pdf.addPage();
      continue;
    }
    if (node.type === "codeBlock") {
      pdf.fontSize(10);
      renderPdfRuns(pdf, pdfRuns(node, true), pdfBlockOptions(node));
      pdf.moveDown(0.45);
      continue;
    }
    pdf.fontSize(11);
    renderPdfRuns(pdf, pdfRuns(node), pdfBlockOptions(node));
    pdf.moveDown(0.45);
  }
}

export async function createPdfDocument({
  documentId,
  title,
  content,
}: {
  documentId: string;
  title: string;
  content: JSONContent | null;
}) {
  const pdf = new PDFDocument({
    size: "A4",
    margins: { top: 54, right: 54, bottom: 54, left: 54 },
    info: { Title: title, Creator: "Thido" },
  });
  const chunks: Buffer[] = [];
  pdf.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  pdf.font("Times-Bold").fontSize(24).text(title);
  pdf.moveDown(1);
  if (content?.content) {
    await renderPdfBlocks(pdf, documentId, content.content);
  }
  pdf.end();
  return completed;
}

export function safeDownloadName(title: string) {
  const normalized = title
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9._ -]+/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100);
  return normalized || "document";
}
