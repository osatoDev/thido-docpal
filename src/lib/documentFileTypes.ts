const SUPPORTED_DOCUMENT_EXTENSIONS = [".docx", ".md"] as const;

export function isSupportedDocumentFileName(name: string) {
  const normalized = name.trim().toLowerCase();
  return SUPPORTED_DOCUMENT_EXTENSIONS.some((extension) =>
    normalized.endsWith(extension),
  );
}

export const SUPPORTED_DOCUMENT_FILE_LABEL = "Word (.docx) or Markdown (.md)";
