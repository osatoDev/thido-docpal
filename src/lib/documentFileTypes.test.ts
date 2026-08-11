import { describe, expect, it } from "vitest";

import {
  DOCUMENT_IMPORT_ACCEPT,
  DOCUMENT_IMPORT_EXTENSION_LABEL,
  DOCUMENT_IMPORT_NOTES_NOTICE_MS,
  DOCUMENT_IMPORT_SUCCESS_NOTICE_MS,
  documentImportFormatForFileName,
  documentImportTitleFromFileName,
  isSupportedDocumentFileName,
} from "@/lib/documentFileTypes";

describe("supported document file names", () => {
  it("accepts Word, Markdown, and plain-text files case-insensitively", () => {
    expect(isSupportedDocumentFileName("draft.docx")).toBe(true);
    expect(isSupportedDocumentFileName("archive.DOC")).toBe(true);
    expect(isSupportedDocumentFileName("proposal.odt")).toBe(true);
    expect(isSupportedDocumentFileName("letter.rtf")).toBe(true);
    expect(isSupportedDocumentFileName("NOTES.MD")).toBe(true);
    expect(isSupportedDocumentFileName("outline.TXT")).toBe(true);
  });

  it("rejects unsupported and misleading extensions", () => {
    expect(isSupportedDocumentFileName("draft.pdf")).toBe(false);
    expect(isSupportedDocumentFileName("draft.md.exe")).toBe(false);
  });

  it("shares format metadata with pickers and server validation", () => {
    expect(documentImportFormatForFileName("notes.txt")).toMatchObject({
      kind: "text",
      maximumBytes: 2 * 1024 * 1024,
    });
    expect(documentImportTitleFromFileName("Project.DOCX")).toBe("Project");
    expect(DOCUMENT_IMPORT_ACCEPT).toContain(".txt");
    expect(DOCUMENT_IMPORT_ACCEPT).toContain(".doc");
    expect(DOCUMENT_IMPORT_ACCEPT).toContain(".odt");
    expect(DOCUMENT_IMPORT_ACCEPT).toContain(".rtf");
    expect(DOCUMENT_IMPORT_ACCEPT).toContain("text/plain");
    expect(DOCUMENT_IMPORT_EXTENSION_LABEL).toBe(
      ".docx, .doc, .odt, .rtf, .md, .txt",
    );
    expect(DOCUMENT_IMPORT_SUCCESS_NOTICE_MS).toBe(4_000);
    expect(DOCUMENT_IMPORT_NOTES_NOTICE_MS).toBe(10_000);
  });
});
