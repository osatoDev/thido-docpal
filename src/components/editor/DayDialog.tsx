"use client";

import { useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { todayDay, validDay } from "@/lib/documentDays";

export function DayDialog({ editor, onClose, onApplied }: { editor: Editor; onClose: () => void; onApplied: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const selection = useRef(editor.state.selection);
  const [date, setDate] = useState(() => editor.getAttributes("dayHeader").date || todayDay());
  const [error, setError] = useState("");
  useEffect(() => { dialog.current?.showModal(); }, []);
  return (
    <dialog ref={dialog} onCancel={onClose} onClose={onClose} aria-label="Format as day" className="app-panel fixed inset-0 m-auto w-[min(90vw,24rem)] rounded-xl p-5 backdrop:bg-black/45">
      <form onSubmit={event => {
        event.preventDefault();
        const applied = editor.chain().focus().setTextSelection({ from: selection.current.from, to: selection.current.to }).setDayHeader(date).run();
        if (!applied) { setError("Place the cursor in a single line outside a list or table, then try again."); return; }
        onApplied(); onClose();
      }}>
        <h2 className="text-lg font-semibold">Format as day</h2>
        <p className="my-3 text-sm text-[var(--muted)]">Choose a date for this line. Try writing “tomorrow” or “11 October” to apply a day directly next time.</p>
        <label className="grid gap-2 text-sm">Date
          <input autoFocus required type="date" value={date} onChange={event => setDate(event.target.value)} className="app-input rounded-md p-2" />
        </label>
        {error ? <p role="alert" className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="app-button-secondary px-3 py-2">Cancel</button>
          <button type="submit" disabled={!validDay(date)} className="app-button-primary px-3 py-2 disabled:opacity-50">Apply day</button>
        </div>
      </form>
    </dialog>
  );
}
