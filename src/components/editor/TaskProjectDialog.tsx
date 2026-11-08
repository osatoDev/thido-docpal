"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { EditorState } from "@tiptap/pm/state";
import { addProject, PROJECT_NAME_MAX_LENGTH, readProjects, setTaskProject } from "@/lib/planProjects";
import { SET_TASK_PROJECT_EVENT, type SetTaskProjectDetail } from "./extensions/StyledTaskList";

type Target = { position: number; item: ProseMirrorNode };

/** Opens from a task's folder button and puts the task in a project. */
export function TaskProjectDialog({ editor }: { editor: Editor }) {
  const [target, setTarget] = useState<Target | null>(null);
  useEffect(() => {
    const dom = editor.view.dom;
    const open = (event: Event) => {
      const { position } = (event as CustomEvent<SetTaskProjectDetail>).detail;
      const item = editor.state.doc.nodeAt(position);
      if (item?.type.name !== "taskItem") return;
      setTarget({ position, item });
    };
    dom.addEventListener(SET_TASK_PROJECT_EVENT, open);
    return () => dom.removeEventListener(SET_TASK_PROJECT_EVENT, open);
  }, [editor]);
  return target ? <TaskProjectForm key={target.position} editor={editor} target={target} onClose={() => setTarget(null)} /> : null;
}

function TaskProjectForm({ editor, target, onClose }: { editor: Editor; target: Target; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const projects = readProjects(editor.state.doc);
  const current = typeof target.item.attrs.project === "string" ? target.item.attrs.project : null;
  const label = (target.item.firstChild?.textContent ?? "").trim() || "this task";

  const stillThere = () => {
    // The plan may have changed while the dialog was open.
    if (editor.state.doc.nodeAt(target.position) === target.item) return true;
    setError("This task changed. Close this and try again.");
    return false;
  };
  const assign = (id: string | null) => {
    if (!stillThere()) return;
    const tr = setTaskProject(editor.state, target.position, id);
    if (!tr) { setError("Thido couldn't set the project."); return; }
    editor.view.dispatch(tr);
    editor.view.focus();
    onClose();
  };
  const createAndAssign = () => {
    if (!stillThere()) return;
    const added = addProject(editor.state, name);
    if (!added) { setError("Give the project a name."); return; }
    // Add the project and tag the task in one undoable step.
    const tr = added.tr ?? editor.state.tr;
    const afterAdd = EditorState.create({ doc: tr.doc, schema: editor.state.schema });
    const mapped = tr.mapping.map(target.position);
    const assignTr = setTaskProject(afterAdd, mapped, added.project.id);
    if (!assignTr) { setError("Thido couldn't set the project."); return; }
    assignTr.steps.forEach(step => tr.step(step));
    editor.view.dispatch(tr);
    editor.view.focus();
    onClose();
  };

  return (
    <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label="Set project" className="app-panel fixed inset-0 m-auto w-[min(90vw,24rem)] rounded-xl p-5 backdrop:bg-black/45">
      <form onSubmit={event => { event.preventDefault(); createAndAssign(); }}>
        <h2 className="text-lg font-semibold">Set project</h2>
        <p className="my-3 truncate text-sm text-[var(--muted)]">&ldquo;{label}&rdquo;</p>
        {projects.length > 0 ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {projects.map(project => (
              <button
                key={project.id}
                type="button"
                aria-pressed={project.id === current}
                onClick={() => assign(project.id)}
                className={`px-3 py-1.5 text-sm ${project.id === current ? "app-button-primary" : "app-button-secondary"}`}
              >
                {project.name}
              </button>
            ))}
          </div>
        ) : null}
        <label className="grid gap-2 text-sm">New project
          <input
            autoFocus
            value={name}
            maxLength={PROJECT_NAME_MAX_LENGTH}
            placeholder="e.g. Home move"
            onChange={event => { setName(event.target.value); setError(""); }}
            className="app-input rounded-md p-2"
          />
        </label>
        {error ? <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {current ? <button type="button" onClick={() => assign(null)} className="app-button-secondary mr-auto px-3 py-2">Remove project</button> : null}
          <button type="button" onClick={onClose} className="app-button-secondary px-3 py-2">Cancel</button>
          <button type="submit" disabled={!name.trim()} className="app-button-primary px-3 py-2 disabled:opacity-50">Add</button>
        </div>
      </form>
    </dialog>
  );
}
