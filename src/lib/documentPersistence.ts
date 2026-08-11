export const DEFAULT_DOCUMENT_TITLE = "Untitled Document";
const TIMESTAMPED_DEFAULT_TITLE =
  /^Untitled Document (?:-|\u2014) \d{4}-\d{2}-\d{2} \d{2}:\d{2} UTC$/;

export function createDefaultDocumentTitle(date = new Date()) {
  return `${DEFAULT_DOCUMENT_TITLE} - ${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
}

export function createLocalizedDefaultDocumentTitle(
  date: Date,
  locale?: string,
  timeZone?: string,
) {
  const dateTime = new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
  const zoneName = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: "short",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  return `${DEFAULT_DOCUMENT_TITLE} - ${dateTime}${zoneName ? ` ${zoneName}` : ""}`;
}

export function isDefaultDocumentTitle(title: string) {
  return title === DEFAULT_DOCUMENT_TITLE || TIMESTAMPED_DEFAULT_TITLE.test(title);
}

const MAX_DOCUMENT_TITLE_LENGTH = 200;

function nodeText(value: unknown): string {
  if (Array.isArray(value)) return value.map(nodeText).join("");
  if (!value || typeof value !== "object") return "";

  const node = value as { text?: unknown; content?: unknown };
  return `${typeof node.text === "string" ? node.text : ""}${nodeText(node.content)}`;
}

/** Uses the first top-level heading as an unnamed document's title. */
export function inferDocumentTitle(content: unknown) {
  if (!content || typeof content !== "object") return null;
  const nodes = (content as { content?: unknown }).content;
  if (!Array.isArray(nodes)) return null;

  for (const node of nodes) {
    if (!node || typeof node !== "object" || (node as { type?: unknown }).type !== "heading") {
      continue;
    }
    const title = nodeText(node).replace(/\s+/g, " ").trim();
    if (title) return title.slice(0, MAX_DOCUMENT_TITLE_LENGTH).trimEnd();
  }

  return null;
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
