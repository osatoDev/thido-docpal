const REDACTED = "[redacted]";

const SENSITIVE_FIELD =
  /^(?:access_?token|authorization|comment_?text|content|cookie|document_?content|email|form_?data|password|prompt|proposed_?text|quoted_?text|request_?body|secret|set-cookie|token)$/i;

const ROUTE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\/share\/[^/?#\s]+/gi, "/share/[token]"],
  [/\/api\/documents\/[^/?#\s]+/gi, "/api/documents/[id]"],
  [/\/documents\/[^/?#\s]+/gi, "/documents/[id]"],
  [/\/api\/comments\/[^/?#\s]+/gi, "/api/comments/[id]"],
  [/\/api\/suggestions\/[^/?#\s]+/gi, "/api/suggestions/[id]"],
];

export function sanitizeRollbarString(value: string) {
  let sanitized = value
    .replace(
      /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      "[redacted-email]",
    )
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, "Bearer [redacted]")
    .replace(
      /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
      "[redacted-token]",
    )
    .replace(
      /([?&](?:access_token|code|email|key|secret|token)=)[^&#\s]+/gi,
      `$1${REDACTED}`,
    );

  for (const [pattern, replacement] of ROUTE_REPLACEMENTS) {
    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized.length > 2_000
    ? `${sanitized.slice(0, 2_000)}…[truncated]`
    : sanitized;
}

export function sanitizeRollbarValue(
  value: unknown,
  key = "",
  depth = 0,
): unknown {
  if (SENSITIVE_FIELD.test(key)) return REDACTED;
  if (typeof value === "string") return sanitizeRollbarString(value);
  if (
    value === null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "undefined"
  ) {
    return value;
  }
  if (depth >= 8) return "[truncated]";
  if (Array.isArray(value)) {
    return value.map((entry) => sanitizeRollbarValue(entry, "", depth + 1));
  }
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        sanitizeRollbarValue(entryValue, entryKey, depth + 1),
      ]),
    );
  }
  return String(value);
}

export function sanitizeRollbarPayload(payload: Record<string, unknown>) {
  const sanitized = sanitizeRollbarValue(payload);
  if (!sanitized || typeof sanitized !== "object" || Array.isArray(sanitized)) {
    return;
  }

  for (const key of Object.keys(payload)) delete payload[key];
  Object.assign(payload, sanitized);
}
