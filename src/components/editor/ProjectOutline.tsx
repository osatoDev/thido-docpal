"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { formatDay } from "@/lib/documentDays";
import {
  addProject,
  deleteProject,
  PROJECT_NAME_MAX_LENGTH,
  projectTasks,
  readProjects,
  renameProject,
} from "@/lib/planProjects";

function readAll(editor: Editor) {
  return readProjects(editor.state.doc).map(project => ({
    ...project,
    tasks: projectTasks(editor.state.doc, project.id),
  }));
}

/** Projects in the plan, each listing its tasks across every day. */
export function ProjectOutline({ editor, canEdit }: { editor: Editor; canEdit: boolean }) {
  const [projects, setProjects] = useState(() => readAll(editor));
  const [name, setName] = useState("");
  const [editing, setEditing] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  useEffect(() => {
    const refresh = () => setProjects(readAll(editor));
    editor.on("update", refresh);
    return () => { editor.off("update", refresh); };
  }, [editor]);

  const add = () => {
    const added = addProject(editor.state, name);
    if (added?.tr) editor.view.dispatch(added.tr);
    setName("");
  };
  const rename = () => {
    if (!editing) return;
    const tr = renameProject(editor.state, editing.id, editing.name);
    if (tr) editor.view.dispatch(tr);
    setEditing(null);
  };
  const remove = (id: string) => {
    const tr = deleteProject(editor.state, id);
    if (tr) editor.view.dispatch(tr);
    setConfirmDelete(null);
  };
  const jump = (position: number) =>
    editor.chain().focus().setTextSelection(position + 2).scrollIntoView().run();

  return (
    <nav aria-label="Projects" className="mt-4 border-b border-[var(--border)] pb-3 text-xs">
      <h3 className="mb-2 font-semibold uppercase tracking-wide text-[var(--muted)]">Projects</h3>
      {projects.length === 0 ? (
        <p className="mb-2 text-[var(--muted)]">
          Group tasks from any day. Add a project here, then use the folder button on a task.
        </p>
      ) : null}
      <ul>
        {projects.map(project => {
          const open = project.tasks.filter(task => !task.checked).length;
          return (
            <li key={project.id}>
              <details>
                <summary className="flex cursor-pointer items-center gap-2 py-1">
                  {editing?.id === project.id ? (
                    <input
                      autoFocus
                      aria-label={`Rename ${project.name}`}
                      value={editing.name}
                      maxLength={PROJECT_NAME_MAX_LENGTH}
                      onChange={event => setEditing({ id: project.id, name: event.target.value })}
                      onKeyDown={event => {
                        if (event.key === "Enter") { event.preventDefault(); rename(); }
                        if (event.key === "Escape") { event.preventDefault(); setEditing(null); }
                      }}
                      onBlur={rename}
                      onClick={event => event.preventDefault()}
                      className="app-input min-w-0 flex-1 rounded-sm px-1.5 py-0.5"
                    />
                  ) : (
                    <span className="min-w-0 flex-1 truncate font-semibold">{project.name}</span>
                  )}
                  <span className="shrink-0 text-[var(--muted)]" title={`${open} open of ${project.tasks.length}`}>
                    {open}/{project.tasks.length}
                  </span>
                </summary>
                <div className="ml-3">
                  {project.tasks.length === 0 ? (
                    <p className="py-1 text-[var(--muted)]">No tasks yet.</p>
                  ) : (
                    <ol>
                      {project.tasks.map(task => (
                        <li key={task.position}>
                          <button
                            type="button"
                            onClick={() => jump(task.position)}
                            className={`w-full rounded-sm px-2 py-1 text-left hover:bg-[var(--surface-subtle)] ${task.checked ? "text-[var(--muted)] line-through" : ""}`}
                          >
                            <span className="text-[var(--muted)]">{task.date ? formatDay(task.date) : "No day"}</span>
                            {" · "}
                            {task.text || "Empty task"}
                          </button>
                        </li>
                      ))}
                    </ol>
                  )}
                  {canEdit ? (
                    <div className="flex flex-wrap gap-3 py-1 text-[var(--muted)]">
                      <button type="button" className="text-link" onClick={() => setEditing({ id: project.id, name: project.name })}>
                        Rename
                      </button>
                      {confirmDelete === project.id ? (
                        <>
                          <button type="button" className="text-link text-[var(--danger)]" onClick={() => remove(project.id)}>
                            Delete project (tasks stay)
                          </button>
                          <button type="button" className="text-link" onClick={() => setConfirmDelete(null)}>
                            Keep
                          </button>
                        </>
                      ) : (
                        <button type="button" className="text-link" onClick={() => setConfirmDelete(project.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
      {canEdit ? (
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={event => { event.preventDefault(); add(); }}
        >
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
