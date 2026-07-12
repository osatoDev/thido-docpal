"use client";

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import { getEditorExtensions } from "@/lib/editorExtensions";
import { Toolbar } from "./Toolbar";
import { CommentSidebar } from "@/components/comments/CommentSidebar";
import { CommentComposer } from "@/components/comments/CommentComposer";
import { AiModeToggle } from "@/components/settings/AiModeToggle";
import type { CommentWithReplies } from "@/lib/types";

type Props = {
  documentId: string;
  initialTitle: string;
  initialContent: JSONContent | null;
  initialComments: CommentWithReplies[];
};

type SaveState = "idle" | "saving" | "saved" | "error";
type ActiveComposer = {
  anchorMarkId: string;
  quotedText: string;
  from: number;
  to: number;
};

export function TiptapEditor({
  documentId,
  initialTitle,
  initialContent,
  initialComments,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [comments, setComments] = useState<CommentWithReplies[]>(initialComments);
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: getEditorExtensions(),
    content: initialContent ?? "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[60vh] focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      scheduleSave({ content: editor.getJSON() });
    },
  });

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function scheduleSave(next: { title?: string; content?: JSONContent }) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setSaveState("saving");
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        });
        setSaveState(res.ok ? "saved" : "error");
      } catch {
        setSaveState("error");
      }
    }, 600);
  }

  function startComment() {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from === to) return;

    const quotedText = editor.state.doc.textBetween(from, to, " ");
    const anchorMarkId = crypto.randomUUID();

    editor.chain().setComment(anchorMarkId).run();
    setActiveComposer({ anchorMarkId, quotedText, from, to });
  }

  function cancelComment() {
    if (editor && activeComposer) {
      editor
        .chain()
        .setTextSelection({ from: activeComposer.from, to: activeComposer.to })
        .unsetComment()
        .run();
    }
    setActiveComposer(null);
  }

  async function submitComment(body: string) {
    if (!activeComposer) return;
    try {
      const res = await fetch(`/api/documents/${documentId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anchorMarkId: activeComposer.anchorMarkId,
          quotedText: activeComposer.quotedText,
          body,
        }),
      });
      if (!res.ok) throw new Error("Could not create comment");
      const data = await res.json();

      const newComment: CommentWithReplies = {
        ...data.comment,
        replies: data.aiReply ? [data.aiReply] : [],
        suggestion: data.suggestion ?? null,
      };
      setComments((prev) => [newComment, ...prev]);

      if (data.documentContent && editor) {
        editor.commands.setContent(data.documentContent);
      }
    } finally {
      setActiveComposer(null);
    }
  }

  function handleCommentChange(updated: CommentWithReplies) {
    setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  function handleCommentDelete(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function handleDocumentContentUpdated(content: unknown) {
    if (content && editor) {
      editor.commands.setContent(content as JSONContent);
    }
  }

  return (
    <div className="flex flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4 p-8">
        <div className="flex items-center justify-between gap-4">
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave({ title: e.target.value });
            }}
            className="w-full border-none text-xl font-semibold outline-none"
          />
          <div className="flex shrink-0 items-center gap-3">
            <AiModeToggle />
            <span className="text-xs text-gray-400">
              {saveState === "saving" && "Saving…"}
              {saveState === "saved" && "Saved"}
              {saveState === "error" && "Save failed"}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col rounded-md border">
          <Toolbar editor={editor} />
          {editor && (
            <BubbleMenu editor={editor}>
              <div className="flex items-center gap-1 rounded-md border bg-white p-1 shadow-md">
                <button
                  type="button"
                  onClick={startComment}
                  className="rounded px-2 py-1 text-xs font-medium hover:bg-gray-100"
                >
                  💬 Comment
                </button>
              </div>
            </BubbleMenu>
          )}
          <div className="flex-1 overflow-y-auto p-4">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="flex w-80 shrink-0 flex-col">
        {activeComposer && (
          <div className="border-b p-4">
            <CommentComposer
              quotedText={activeComposer.quotedText}
              onSubmit={submitComment}
              onCancel={cancelComment}
            />
          </div>
        )}
        <CommentSidebar
          comments={comments}
          onChange={handleCommentChange}
          onDelete={handleCommentDelete}
          onDocumentContentUpdated={handleDocumentContentUpdated}
        />
      </div>
    </div>
  );
}
