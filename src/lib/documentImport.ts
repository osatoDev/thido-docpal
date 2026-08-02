import sanitizeHtml from "sanitize-html";

export function sanitizeImportedWordHtml(html: string) {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "h1",
      "h2",
      "h3",
      "strong",
      "b",
      "em",
      "i",
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
    ],
    allowedAttributes: {
      img: ["src", "alt"],
      ol: ["start"],
    },
    allowedSchemes: [],
    exclusiveFilter: (frame) =>
      frame.tag === "img" &&
      !frame.attribs.src?.startsWith("/api/document-images/"),
  });
}
