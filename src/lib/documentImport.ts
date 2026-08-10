import sanitizeHtml from "sanitize-html";
import type { JSONContent } from "@tiptap/core";

import { plainTextToTiptapNodes } from "@/lib/textTable";

function decodeText(input: Uint8Array) {
  if (input[0] === 0xff && input[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(input.subarray(2));
  }
  if (input[0] === 0xfe && input[1] === 0xff) {
    const littleEndian = new Uint8Array(input.length - 2);
    for (let index = 2; index + 1 < input.length; index += 2) {
      littleEndian[index - 2] = input[index + 1];
      littleEndian[index - 1] = input[index];
    }
    return new TextDecoder("utf-16le").decode(littleEndian);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    return new TextDecoder("windows-1252").decode(input);
  }
}

export function importedPlainTextStringToDocument(input: string): JSONContent {
  const text = input.replace(/^\uFEFF/, "");
  const unsafeControlCharacters = Array.from(text).filter((character) => {
    const code = character.charCodeAt(0);
    return code === 0 || (code < 0x20 && !"\n\r\t".includes(character));
  }).length;
  if (unsafeControlCharacters > Math.max(4, text.length * 0.01)) {
    throw new Error("This file does not appear to contain plain text.");
  }

  return {
    type: "doc",
    content: plainTextToTiptapNodes(text),
  };
}

export function importedPlainTextToDocument(input: Uint8Array): JSONContent {
  return importedPlainTextStringToDocument(decodeText(input));
}

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
