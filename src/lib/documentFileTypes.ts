export type DocumentImportFileKind =
  | "doc"
  | "docx"
  | "markdown"
  | "odt"
  | "rtf"
  | "text";

export type DocumentImportFormat = {
  extension: string;
  kind: DocumentImportFileKind;
  label: string;
  maximumBytes: number;
  mimeTypes: readonly string[];
  sizeError: string;
};

export const DOCUMENT_IMPORT_FORMATS: readonly DocumentImportFormat[] = [
  {
    extension: ".docx",
    kind: "docx",
    label: "Word (.docx)",
    maximumBytes: 15 * 1024 * 1024,
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    sizeError: "Word files must be smaller than 15 MB.",
  },
  {
    extension: ".doc",
    kind: "doc",
    label: "legacy Word (.doc)",
    maximumBytes: 10 * 1024 * 1024,
    mimeTypes: ["application/msword"],
    sizeError: "Legacy Word files must be smaller than 10 MB.",
  },
  {
    extension: ".odt",
    kind: "odt",
    label: "OpenDocument (.odt)",
    maximumBytes: 15 * 1024 * 1024,
    mimeTypes: ["application/vnd.oasis.opendocument.text"],
    sizeError: "OpenDocument files must be smaller than 15 MB.",
  },
  {
    extension: ".rtf",
    kind: "rtf",
    label: "Rich Text (.rtf)",
    maximumBytes: 5 * 1024 * 1024,
    mimeTypes: ["application/rtf", "text/rtf"],
    sizeError: "Rich Text files must be smaller than 5 MB.",
  },
  {
    extension: ".md",
    kind: "markdown",
    label: "Markdown (.md)",
    maximumBytes: 2 * 1024 * 1024,
    mimeTypes: ["text/markdown"],
    sizeError: "Markdown files must be smaller than 2 MB.",
  },
  {
    extension: ".txt",
    kind: "text",
    label: "plain text (.txt)",
    maximumBytes: 2 * 1024 * 1024,
    mimeTypes: ["text/plain"],
    sizeError: "Plain-text files must be smaller than 2 MB.",
  },
];

export function documentImportFormatForFileName(name: string) {
  const normalized = name.trim().toLowerCase();
  return DOCUMENT_IMPORT_FORMATS.find((format) =>
    normalized.endsWith(format.extension),
  );
}

export function isSupportedDocumentFileName(name: string) {
  return documentImportFormatForFileName(name) !== undefined;
}

export function documentImportTitleFromFileName(name: string) {
  const format = documentImportFormatForFileName(name);
  return format ? name.slice(0, -format.extension.length) : name;
}

export const DOCUMENT_IMPORT_ACCEPT = DOCUMENT_IMPORT_FORMATS.flatMap(
  (format) => [format.extension, ...format.mimeTypes],
).join(",");

export const DOCUMENT_IMPORT_EXTENSION_LABEL = DOCUMENT_IMPORT_FORMATS.map(
  (format) => format.extension,
).join(", ");

export const SUPPORTED_DOCUMENT_FILE_LABEL =
  "Word (.docx and .doc), OpenDocument (.odt), Rich Text (.rtf), Markdown (.md), or plain text (.txt)";
