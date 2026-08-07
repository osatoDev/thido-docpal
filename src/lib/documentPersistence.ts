export const DEFAULT_DOCUMENT_TITLE = "Untitled Document";
const TIMESTAMPED_DEFAULT_TITLE =
  /^Untitled Document — \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/;

export function createDefaultDocumentTitle(date = new Date()) {
  return `${DEFAULT_DOCUMENT_TITLE} — ${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function isDefaultDocumentTitle(title: string) {
  return title === DEFAULT_DOCUMENT_TITLE || TIMESTAMPED_DEFAULT_TITLE.test(title);
}

const MEANINGFUL_LEAF_NODES = new Set(["horizontalRule", "image", "table"]);

function hasMeaningfulNode(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasMeaningfulNode);
  }
  if (!value || typeof value !== "object") {
    return false;
  }

  const node = value as {
    type?: unknown;
    text?: unknown;
    content?: unknown;
  };
  if (typeof node.text === "string" && node.text.trim().length > 0) {
    return true;
  }
  if (
    typeof node.type === "string" &&
    MEANINGFUL_LEAF_NODES.has(node.type)
  ) {
    return true;
  }

  return hasMeaningfulNode(node.content);
}

export function hasMeaningfulDocumentContent(content: unknown) {
  return hasMeaningfulNode(content);
}

export function shouldPromotePlaceholder({
  title,
  content,
}: {
  title?: unknown;
  content?: unknown;
}) {
  const hasCustomTitle =
    typeof title === "string" &&
    title.trim().length > 0 &&
    !isDefaultDocumentTitle(title.trim());

  return hasCustomTitle || hasMeaningfulDocumentContent(content);
}
