import { isDefaultDocumentTitle } from "@/lib/documentPersistence";

export const MAX_DOCUMENT_TITLE_SLUG_LENGTH = 80;

export function documentTitleSlug(title: string) {
  const normalized = title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[’']/gu, "")
    .replace(/\p{Mark}+/gu, "")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/gu, "");

  return Array.from(normalized)
    .slice(0, MAX_DOCUMENT_TITLE_SLUG_LENGTH)
    .join("")
    .replace(/-+$/gu, "");
}

export function documentEditPath(documentId: string, title?: string | null) {
  const basePath = `/documents/${encodeURIComponent(documentId)}/edit`;
  if (!title || isDefaultDocumentTitle(title.trim())) return basePath;

  const slug = documentTitleSlug(title);
  return slug ? `${basePath}/${encodeURIComponent(slug)}` : basePath;
}
