export const DEFAULT_DOCUMENT_TITLE = "Untitled Document";

const MEANINGFUL_LEAF_NODES = new Set(["horizontalRule", "image"]);

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
    title.trim() !== DEFAULT_DOCUMENT_TITLE;

  return hasCustomTitle || hasMeaningfulDocumentContent(content);
}
