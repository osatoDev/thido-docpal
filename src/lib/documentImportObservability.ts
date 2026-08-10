import type { DocumentImportFileKind as SupportedDocumentImportFileKind } from "@/lib/documentFileTypes";

export type DocumentImportFileKind =
  | SupportedDocumentImportFileKind
  | "unknown";
export type DocumentImportLogLevel = "error" | "info" | "warning";

type DocumentImportLogInput = {
  documentId?: string;
  durationMs?: number;
  error?: unknown;
  event: "document_import_finished" | "document_import_started";
  fileKind: DocumentImportFileKind;
  level: DocumentImportLogLevel;
  reason?: string;
  requestId: string;
  status?: number;
};

const SAFE_REQUEST_ID = /^[A-Za-z0-9:._-]{1,200}$/;
const SAFE_ERROR_NAME = /^[A-Za-z][A-Za-z0-9._-]{0,119}$/;

export function documentImportRequestId(
  headers: Headers,
  createFallback: () => string = () => crypto.randomUUID(),
) {
  const candidate =
    headers.get("x-vercel-id")?.trim() ||
    headers.get("x-request-id")?.trim() ||
    "";
  return SAFE_REQUEST_ID.test(candidate) ? candidate : createFallback();
}

export function safeDocumentImportError(error: unknown) {
  const candidate = error instanceof Error ? error.name : "NonErrorThrown";
  return {
    errorName: SAFE_ERROR_NAME.test(candidate) ? candidate : "Error",
  };
}

export function documentImportLogEntry(input: DocumentImportLogInput) {
  return {
    level: input.level,
    event: input.event,
    source: "document-import",
    requestId: input.requestId,
    fileKind: input.fileKind,
    ...(input.documentId ? { documentId: input.documentId } : {}),
    ...(typeof input.status === "number" ? { status: input.status } : {}),
    ...(input.reason ? { reason: input.reason } : {}),
    ...(typeof input.durationMs === "number"
      ? { durationMs: Math.max(0, Math.round(input.durationMs)) }
      : {}),
    ...(input.error ? safeDocumentImportError(input.error) : {}),
  };
}

export function writeDocumentImportLog(input: DocumentImportLogInput) {
  const serialized = JSON.stringify(documentImportLogEntry(input));
  if (input.level === "error") {
    console.error(serialized);
  } else if (input.level === "warning") {
    console.warn(serialized);
  } else {
    console.info(serialized);
  }
}
