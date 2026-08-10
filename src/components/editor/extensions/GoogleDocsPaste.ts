import { Extension } from "@tiptap/core";

import { normalizeDocumentColor } from "./RichTextStyle";

const GOOGLE_DOCS_MARKER = /docs-internal-guid-/i;

export function isGoogleDocsClipboardHtml(html: string) {
  return GOOGLE_DOCS_MARKER.test(html);
}

export function hasHtmlTable(html: string) {
  return /<table(?:\s|>)/i.test(html);
}

function removeStyleProperty(element: HTMLElement, property: string) {
  element.style.removeProperty(property);
  if (!element.getAttribute("style")?.trim()) {
    element.removeAttribute("style");
  }
}

/**
 * Google Docs represents highlighting as a background color on a span. Tiptap
 * intentionally models highlighting as a mark, so convert only that style and
 * leave the remaining Google Docs HTML for the editor schema to parse.
 */
export function normalizeGoogleDocsPastedHtml(html: string) {
  if (!isGoogleDocsClipboardHtml(html) || typeof DOMParser === "undefined") {
    return html;
  }

  const document = new DOMParser().parseFromString(html, "text/html");
  document.querySelectorAll("script, style, meta").forEach((element) => {
    element.remove();
  });

  document
    .querySelectorAll<HTMLElement>("[id^='docs-internal-guid-']")
    .forEach((element) => {
      element.replaceWith(...Array.from(element.childNodes));
    });

  document.querySelectorAll<HTMLElement>("span[style]").forEach((span) => {
    const highlight = normalizeDocumentColor(span.style.backgroundColor);
    removeStyleProperty(span, "background-color");
    if (!highlight) return;

    const mark = document.createElement("mark");
    mark.setAttribute("data-color", highlight);
    mark.style.backgroundColor = highlight;
    mark.append(...Array.from(span.childNodes));
    span.append(mark);
  });

  return document.body.innerHTML;
}

export const GoogleDocsPaste = Extension.create({
  name: "googleDocsPaste",

  transformPastedHTML(html) {
    return normalizeGoogleDocsPastedHtml(html);
  },
});
