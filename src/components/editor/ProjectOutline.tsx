"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { addProject, PROJECT_NAME_MAX_LENGTH, readProjects } from "@/lib/planProjects";

/** The plan's projects, each its own to-do list; clicking one jumps to it. */
export function ProjectOutline({ editor, canEdit }: { editor: Editor; canEdit: boolean }) {
  const [projects, setProjects] = useState(() => readProjects(editor.state.doc));
  const [name, setName] = useState("");
  useEffect(() => {
    const refresh = () => setProjects(readProjects(editor.state.doc));
    editor.on("update", refresh);
    return () => { editor.off("update", refresh); };
  }, [editor]);

  const add = () => {
    const tr = addProject(editor.state, name);
    if (!tr) return;
    editor.view.dispatch(tr);
    editor.view.focus();
    setName("");
  };
  const jump = (position: number) =>
    editor.chain().focus().setTextSelection(position + 1).scrollIntoView().run();

  return (
    <nav aria-label="Projects" className="mt-4 border-b border-[var(--border)] pb-3 text-xs">
      <h3 className="mb-2 font-semibold uppercase tracking-wide text-[var(--muted)]">Projects</h3>
      {projects.length === 0 ? (
        <p className="mb-2 text-[var(--muted)]">
          A project is a to-do list of its own, not tied to any day.
        </p>
      ) : (
        <ol>
          {projects.map(project => (
            <li key={project.position}>
              <button
                type="button"
                onClick={() => jump(project.position)}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left hover:bg-[var(--surface-subtle)]"
              >
                <span className="min-w-0 flex-1 truncate">{project.name || "Untitled project"}</span>
                <span className="shrink-0 text-[var(--muted)]" title={`${project.open} open of ${project.total}`}>
                  {project.open}/{project.total}
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
      {canEdit ? (
        <form className="mt-2 flex gap-1.5" onSubmit={event => { event.preventDefault(); add(); }}>
          <input
            aria-label="New project name"
            placeholder="New project"
            value={name}
            maxLength={PROJECT_NAME_MAX_LENGTH}
            onChange={event => setName(event.target.value)}
            className="app-input min-w-0 flex-1 rounded-md px-2 py-1"
          />
          <button type="submit" disabled={!name.trim()} className="app-button-secondary px-2 py-1 disabled:opacity-50">
            Add
          </button>
        </form>
      ) : null}
    </nav>
  );
}
