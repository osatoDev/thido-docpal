"use client";

import { useEffect } from "react";
import type { Editor } from "@tiptap/react";

export function useEditorHashNavigation(editor: Editor | null) {
  useEffect(() => {
    if (!editor) return;
    const currentEditor = editor;

    function revealHashTarget() {
      let id = window.location.hash.slice(1);
      try {
        id = decodeURIComponent(id);
      } catch {
        return;
      }
      if (!id) return;
      const target = document.getElementById(id);
      if (!target || !currentEditor.view.dom.contains(target)) return;
      target.scrollIntoView({ block: "start" });
    }

    const frame = window.requestAnimationFrame(revealHashTarget);
    window.addEventListener("hashchange", revealHashTarget);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", revealHashTarget);
    };
  }, [editor]);
}
