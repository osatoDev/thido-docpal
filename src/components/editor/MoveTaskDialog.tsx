"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { formatDay, todayDay, validDay } from "@/lib/documentDays";
import { dayAtPosition, moveTaskToDay } from "@/lib/scheduleInsert";
import { MOVE_TASK_TO_DAY_EVENT, type MoveTaskToDayDetail } from "./extensions/StyledTaskList";

type Target = { position: number; item: ProseMirrorNode; from: string | null };

function addDays(date: string, amount: number) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + amount);
  return next.toISOString().slice(0, 10);
}

/** Opens from a task's calendar button and moves the task under another day. */
export function MoveTaskDialog({ editor }: { editor: Editor }) {
  const [target, setTarget] = useState<Target | null>(null);
  useEffect(() => {
    const dom = editor.view.dom;
    const open = (event: Event) => {
      const { position } = (event as CustomEvent<MoveTaskToDayDetail>).detail;
      const item = editor.state.doc.nodeAt(position);
      if (item?.type.name !== "taskItem") return;
      setTarget({ position, item, from: dayAtPosition(editor.state.doc, position) });
    };
    dom.addEventListener(MOVE_TASK_TO_DAY_EVENT, open);
    return () => dom.removeEventListener(MOVE_TASK_TO_DAY_EVENT, open);
  }, [editor]);
  return target ? <MoveTaskForm key={target.position} editor={editor} target={target} onClose={() => setTarget(null)} /> : null;
}

function MoveTaskForm({ editor, target, onClose }: { editor: Editor; target: Target; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const base = target.from ?? todayDay();
  const [date, setDate] = useState(() => addDays(base, 1));
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  const label = (target.item.firstChild?.textContent ?? "").trim() || "this task";
  const move = (day: string) => {
    // The plan may have changed while the dialog was open.
    if (editor.state.doc.nodeAt(target.position) !== target.item) {
      setError("This task changed. Close this and try again.");
      return;
    }
    const tr = moveTaskToDay(editor.state, target.position, day);
    if (!tr) { setError("Thido couldn't move this task."); return; }
    editor.view.dispatch(tr);
    editor.view.focus();
    onClose();
  };
  return (
    <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label="Move to another day" className="app-panel fixed inset-0 m-auto w-[min(90vw,24rem)] rounded-xl p-5 backdrop:bg-black/45">
      <form onSubmit={event => { event.preventDefault(); move(date); }}>
        <h2 className="text-lg font-semibold">Move to another day</h2>
        <p className="my-3 truncate text-sm text-[var(--muted)]">“{label}”{target.from ? ` is on ${formatDay(target.from)}.` : ""}</p>
        <div className="mb-3 flex flex-wrap gap-2">
          {target.from !== todayDay() ? <button type="button" onClick={() => move(todayDay())} className="app-button-secondary px-3 py-1.5 text-sm">Today</button> : null}
          <button type="button" onClick={() => move(addDays(base, 1))} className="app-button-secondary px-3 py-1.5 text-sm">Next day</button>
          <button type="button" onClick={() => move(addDays(base, 7))} className="app-button-secondary px-3 py-1.5 text-sm">A week later</button>
        </div>
        <label className="grid gap-2 text-sm">Date
          <input autoFocus required type="date" value={date} onChange={event => setDate(event.target.value)} className="app-input rounded-md p-2" />
        </label>
        {error ? <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="app-button-secondary px-3 py-2">Cancel</button>
          <button type="submit" disabled={!validDay(date) || date === target.from} className="app-button-primary px-3 py-2 disabled:opacity-50">Move</button>
        </div>
      </form>
    </dialog>
  );
}
