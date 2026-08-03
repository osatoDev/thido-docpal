const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_SCHEME = /^[a-z][a-z\d+.-]*:/i;

export function normalizeDocumentLink(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const candidate = EMAIL_ADDRESS.test(trimmed)
    ? `mailto:${trimmed}`
    : HAS_SCHEME.test(trimmed)
      ? trimmed
      : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    if (url.protocol === "mailto:") {
      return EMAIL_ADDRESS.test(url.pathname) ? url.href : null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export function isSafeDocumentLink(value: string) {
  if (!HAS_SCHEME.test(value.trim())) return false;
  return normalizeDocumentLink(value) !== null;
}
