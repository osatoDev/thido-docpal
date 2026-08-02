import {
  AlignmentType,
  Document as WordDocument,
  HeadingLevel,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
  type ParagraphChild,
} from "docx";
import PDFDocument from "pdfkit";
import type { JSONContent } from "@tiptap/react";

import { loadDocumentImageAsPng } from "@/lib/documentFileImages";
import { isBulletStyle, type BulletStyle } from "@/components/editor/extensions/StyledBulletList";

const bulletGlyphs: Record<BulletStyle, string> = {
  disc: "•",
  circle: "○",
  square: "▪",
};

function textRuns(node: JSONContent): TextRun[] {
  if (node.type === "hardBreak") return [new TextRun({ break: 1 })];
  if (node.type === "text") {
    const markTypes = new Set(node.marks?.map((mark) => mark.type));
    return [
      new TextRun({
        text: node.text ?? "",
        bold: markTypes.has("bold"),
        italics: markTypes.has("italic"),
        strike: markTypes.has("strike"),
        font: markTypes.has("code") ? "Courier New" : undefined,
      }),
    ];
  }
  return node.content?.flatMap(textRuns) ?? [];
}

function headingLevel(level: unknown) {
  if (level === 1) return HeadingLevel.HEADING_1;
  if (level === 2) return HeadingLevel.HEADING_2;
  if (level === 3) return HeadingLevel.HEADING_3;
  return undefined;
}

async function wordParagraph(
  documentId: string,
  node: JSONContent,
  options: {
    numbering?: { reference: string; level: number };
    blockquote?: boolean;
  } = {},
) {
  const children: ParagraphChild[] = [];
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
      children.push(...textRuns(child));
    }
  }

  return new Paragraph({
    children,
    heading:
      node.type === "heading" ? headingLevel(node.attrs?.level) : undefined,
    numbering: options.numbering,
    indent: options.blockquote ? { left: 720 } : undefined,
    spacing: { after: node.type === "heading" ? 160 : 120 },
  });
}

async function wordBlocks(
  documentId: string,
  nodes: JSONContent[],
  level = 0,
): Promise<Paragraph[]> {
  const paragraphs: Paragraph[] = [];
  for (const node of nodes) {
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
};

function pdfRuns(node: JSONContent): PdfRun[] {
  if (node.type === "hardBreak") {
    return [{ text: "\n", bold: false, italic: false }];
  }
  if (node.type === "text") {
    const marks = new Set(node.marks?.map((mark) => mark.type));
    return [
      {
        text: node.text ?? "",
        bold: marks.has("bold"),
        italic: marks.has("italic"),
      },
    ];
  }
  return node.content?.flatMap(pdfRuns) ?? [];
}

function pdfFont(run: PdfRun) {
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
    pdf.font(pdfFont(run)).text(run.text, {
      ...options,
      continued: index < runs.length - 1,
    });
  });
}

async function renderPdfBlocks(
  pdf: PDFKit.PDFDocument,
  documentId: string,
  nodes: JSONContent[],
  level = 0,
) {
  for (const node of nodes) {
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
      renderPdfRuns(pdf, pdfRuns(node));
      pdf.moveDown(0.45);
      continue;
    }
    if (node.type === "blockquote") {
      for (const child of node.content ?? []) {
        pdf.fontSize(11).font("Times-Italic");
        renderPdfRuns(pdf, pdfRuns(child), { indent: 22 });
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
    pdf.fontSize(11);
    renderPdfRuns(pdf, pdfRuns(node));
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
