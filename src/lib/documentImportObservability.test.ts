import { describe, expect, it, vi } from "vitest";

import {
  documentImportLogEntry,
  documentImportRequestId,
  safeDocumentImportError,
  writeDocumentImportLog,
} from "@/lib/documentImportObservability";

describe("document import observability", () => {
  it("uses a safe platform request ID and falls back for unsafe values", () => {
    expect(
      documentImportRequestId(
        new Headers({ "x-vercel-id": "fra1::abc-123" }),
        () => "fallback",
      ),
    ).toBe("fra1::abc-123");
    expect(
      documentImportRequestId(
        new Headers({ "x-request-id": "unsafe request id" }),
        () => "fallback",
      ),
    ).toBe("fallback");
  });

  it("omits unexpected error messages so user file data cannot reach logs", () => {
    expect(
      safeDocumentImportError(
        new Error("Could not parse private-plan.docx at https://example.test/a"),
      ),
    ).toEqual({
      errorName: "Error",
    });
    expect(safeDocumentImportError({ message: "private-plan.md" })).toEqual({
      errorName: "NonErrorThrown",
    });
  });

  it("builds a bounded structured outcome without user file data", () => {
    expect(
      documentImportLogEntry({
        documentId: "doc_123",
        durationMs: 12.7,
        event: "document_import_finished",
        fileKind: "markdown",
        level: "warning",
        reason: "file_too_large",
        requestId: "request_123",
        status: 413,
      }),
    ).toEqual({
      level: "warning",
      event: "document_import_finished",
      source: "document-import",
      requestId: "request_123",
      fileKind: "markdown",
      documentId: "doc_123",
      status: 413,
      reason: "file_too_large",
      durationMs: 13,
    });
  });

  it("writes validation outcomes as warning-level JSON", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    writeDocumentImportLog({
      durationMs: 4,
      event: "document_import_finished",
      fileKind: "unknown",
      level: "warning",
      reason: "invalid_file",
      requestId: "request_456",
      status: 400,
    });

    expect(warning).toHaveBeenCalledOnce();
    expect(JSON.parse(String(warning.mock.calls[0]?.[0]))).toMatchObject({
      level: "warning",
      reason: "invalid_file",
      requestId: "request_456",
      status: 400,
    });
    warning.mockRestore();
  });

  it("records each supported document kind without filenames", () => {
    for (const fileKind of ["doc", "docx", "odt", "rtf", "text"] as const) {
      expect(
        documentImportLogEntry({
          event: "document_import_started",
          fileKind,
          level: "info",
          requestId: "request_789",
        }),
      ).toMatchObject({ fileKind });
    }
  });
});
