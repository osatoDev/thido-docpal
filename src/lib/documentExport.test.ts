import { describe, expect, it } from "vitest";
import type { JSONContent } from "@tiptap/react";
import { generateJSON } from "@tiptap/html/server";
import mammoth from "mammoth";

import {
  createPdfDocument,
  createWordDocument,
  safeDownloadName,
} from "@/lib/documentExport";
import { getEditorExtensions } from "@/lib/editorExtensions";

const content: JSONContent = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 1 },
      content: [{ type: "text", text: "A heading" }],
    },
    {
      type: "paragraph",
      content: [
        { type: "text", text: "Normal " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " text and " },
        {
          type: "text",
          text: "a link",
          marks: [{ type: "link", attrs: { href: "https://example.com" } }],
        },
        { type: "text", text: "." },
      ],
    },
    {
      type: "bulletList",
      attrs: { bulletStyle: "square" },
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "List item" }],
            },
          ],
        },
      ],
    },
    {
      type: "taskList",
      content: [
        {
          type: "taskItem",
          attrs: { checked: true },
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Completed task" }],
            },
          ],
        },
      ],
    },
    {
      type: "table",
      content: [
        {
          type: "tableRow",
          content: [
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Name" }],
                },
              ],
            },
            {
              type: "tableHeader",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Status" }],
                },
              ],
            },
          ],
        },
        {
          type: "tableRow",
          content: [
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Draft" }],
                },
              ],
            },
            {
              type: "tableCell",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: "Ready" }],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
};

describe("document export", () => {
  it("creates valid Word and PDF file signatures", async () => {
    const [word, pdf] = await Promise.all([
      createWordDocument({
        documentId: "document-id",
        title: "Export test",
        content,
      }),
      createPdfDocument({
        documentId: "document-id",
        title: "Export test",
        content,
      }),
    ]);

    expect(word.subarray(0, 2).toString()).toBe("PK");
    expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  });

  it("round-trips supported Word structure back into the editor schema", async () => {
    const word = await createWordDocument({
      documentId: "document-id",
      title: "Export test",
      content,
    });
    const converted = await mammoth.convertToHtml({ buffer: word });
    const imported = generateJSON(converted.value, getEditorExtensions());

    expect(imported.content?.[0].type).toBe("heading");
    expect(imported.content?.[0].content?.[0].text).toBe("A heading");
    expect(
      imported.content?.some(
        (node: JSONContent) => node.type === "bulletList",
      ),
    ).toBe(true);
    expect(
      imported.content?.some((node: JSONContent) => node.type === "table"),
    ).toBe(true);
    expect(converted.value).toContain('href="https://example.com"');
  });

  it("creates safe, useful download names", () => {
    expect(safeDownloadName("  Client / Proposal  ")).toBe("Client-Proposal");
    expect(safeDownloadName("🔥")).toBe("document");
  });
});
