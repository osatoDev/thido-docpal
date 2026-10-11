"use client";

import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { formatDay, readDays } from "@/lib/documentDays";

export function DayOutline({ editor }: { editor: Editor }) {
  const [days, setDays] = useState(() => readDays(editor.state.doc));
  useEffect(() => {
    const refresh = () => setDays(readDays(editor.state.doc));
    editor.on("update", refresh);
    return () => { editor.off("update", refresh); };
  }, [editor]);
  return <nav aria-label="Document days" className="mt-4 max-h-80 overflow-y-auto border-b border-[var(--border)] pb-3 text-xs">
    <h3 className="mb-2 font-semibold uppercase tracking-wide text-[var(--muted)]">Days</h3>
    {days.length === 0 ? <p className="text-[var(--muted)]">Use Day beside the heading options to add a date.</p> : null}
    {[...new Set(days.map(day => day.year))].map(year => <details open key={year}>
      <summary className="cursor-pointer py-1 font-semibold">{year}</summary>
      {[...new Set(days.filter(day => day.year === year).map(day => day.month))].map(month => <details open key={month} className="ml-3">
        <summary className="cursor-pointer py-1">{new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(`${month}-01T12:00:00Z`))}</summary>
        {[...new Set(days.filter(day => day.month === month).map(day => day.week))].map(week => <details open key={week} className="ml-3">
          <summary className="cursor-pointer py-1 text-[var(--muted)]">Week {week}</summary>
          <ol className="ml-2">
            {days.filter(day => day.month === month && day.week === week).map(day => <li key={day.position}>
              <button type="button" className="w-full rounded-sm px-2 py-1 text-left hover:bg-[var(--surface-subtle)]" onClick={() => editor.chain().focus().setTextSelection(day.position + 1).scrollIntoView().run()}>
                {formatDay(day.date)}{day.text ? ` — ${day.text}` : ""}
              </button>
            </li>)}
          </ol>
        </details>)}
      </details>)}
    </details>)}
  </nav>;
}
