// @vitest-environment happy-dom

import { Editor, type Content } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import {
  applyDocumentPreferencesToDom,
  getDocumentPreferences,
} from "@/components/editor/extensions/DocumentPreferences";
import { getEditorExtensions } from "@/lib/editorExtensions";

const editors: Editor[] = [];

function makeEditor(content: Content) {
  const editor = new Editor({
    element: document.createElement("div"),
    extensions: getEditorExtensions(),
    content,
  });
  editors.push(editor);
  return editor;
}

afterEach(() => {
  for (const editor of editors.splice(0)) editor.destroy();
});

describe("document side margins", () => {
  it("updates the preferences node and the editor DOM attribute", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "documentPreferences",
          attrs: { sideMargin: "standard" },
        },
        { type: "paragraph", content: [{ type: "text", text: "Body" }] },
      ],
    });

    expect(editor.view.dom.getAttribute("data-document-side-margin")).toBe(
      "standard",
    );

    editor.commands.setDocumentSideMargin("wide");

    expect(getDocumentPreferences(editor.state.doc).sideMargin).toBe("wide");
    expect(editor.view.dom.getAttribute("data-document-side-margin")).toBe(
      "wide",
    );
  });

  it("inserts a preferences node when the document has none", () => {
    const editor = makeEditor({
      type: "doc",
      content: [{ type: "paragraph", content: [{ type: "text", text: "Body" }] }],
    });

    editor.commands.setDocumentSideMargin("narrow");

    expect(getDocumentPreferences(editor.state.doc).sideMargin).toBe("narrow");
    expect(editor.view.dom.getAttribute("data-document-side-margin")).toBe(
      "narrow",
    );
  });

  it("applyDocumentPreferencesToDom mirrors every preference onto an element", () => {
    const editor = makeEditor({
      type: "doc",
      content: [
        {
          type: "documentPreferences",
          attrs: {
            language: "de-DE",
            spellcheck: false,
            direction: "rtl",
            appearance: "editorial",
            sideMargin: "wide",
          },
        },
        { type: "paragraph" },
      ],
    });

    const target = document.createElement("div");
    applyDocumentPreferencesToDom(target, editor.state.doc);

    expect(target.getAttribute("data-document-side-margin")).toBe("wide");
    expect(target.getAttribute("data-document-appearance")).toBe("editorial");
    expect(target.getAttribute("data-document-language")).toBe("de-DE");
    expect(target.dir).toBe("rtl");
    expect(target.spellcheck).toBe(false);
  });
});
