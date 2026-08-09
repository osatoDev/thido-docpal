import sanitizeHtml from "sanitize-html";

export function sanitizeImportedDocumentHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "mark",
      "sup",
      "sub",
      "s",
      "strike",
      "del",
      "ul",
      "ol",
      "li",
      "blockquote",
      "br",
      "hr",
      "img",
      "pre",
      "code",
      "a",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      img: ["src", "alt"],
      ol: ["start"],
      a: ["href"],
      th: ["colspan", "rowspan"],
      td: ["colspan", "rowspan"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    exclusiveFilter: (frame) =>
      frame.tag === "img" &&
      !frame.attribs.src?.startsWith("/api/document-images/"),
  });
}

export const sanitizeImportedWordHtml = sanitizeImportedDocumentHtml;
