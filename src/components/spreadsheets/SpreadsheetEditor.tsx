"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { ConflictRecovery } from "@/components/conflicts/ConflictRecovery";
import { Brand } from "@/components/Brand";
import {
  UserMenu,
  type UserMenuProfile,
} from "@/components/account/UserMenu";
import {
  calculateSpreadsheetValues,
  MAX_SPREADSHEET_CELL_LENGTH,
  MAX_SPREADSHEET_COLUMNS,
  MAX_SPREADSHEET_ROWS,
  pasteSpreadsheetText,
  spreadsheetCellReference,
  spreadsheetColumnLabel,
  type SpreadsheetContent,
} from "@/lib/spreadsheet";

type SaveState = "saved" | "saving" | "error" | "conflict";

type Props = {
  spreadsheetId: string;
  initialTitle: string;
  initialContent: SpreadsheetContent;
  initialRevision: number;
  currentUser: UserMenuProfile;
};

function saveLabel(state: SaveState) {
  if (state === "saving") return "Saving…";
  if (state === "error") return "Couldn’t save";
  if (state === "conflict") return "Newer version found";
  return "Saved";
}

export function SpreadsheetEditor({
  spreadsheetId,
  initialTitle,
  initialContent,
  initialRevision,
  currentUser,
}: Props) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [selectedCell, setSelectedCell] = useState("A1");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [changeVersion, setChangeVersion] = useState(0);
  const revisionRef = useRef(initialRevision);
  const latestVersionRef = useRef(0);
  const saveChainRef = useRef(Promise.resolve());
  const conflictRef = useRef(false);
  const mountedRef = useRef(true);

  const calculatedValues = useMemo(
    () => calculateSpreadsheetValues(content),
    [content],
  );
  const columnLabels = useMemo(
    () =>
      Array.from({ length: content.columns }, (_, index) =>
        spreadsheetColumnLabel(index),
      ),
    [content.columns],
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (changeVersion === 0 || conflictRef.current || !title.trim()) return;
    const snapshot = { content, title };
    const snapshotVersion = changeVersion;
    const timeout = window.setTimeout(() => {
      if (conflictRef.current) return;
      setSaveState("saving");
      saveChainRef.current = saveChainRef.current
        .then(async () => {
          if (conflictRef.current) return;
          const response = await fetch(`/api/spreadsheets/${spreadsheetId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              baseRevision: revisionRef.current,
              content: snapshot.content,
              title: snapshot.title,
            }),
          });
          const result = await response.json().catch(() => ({}));
          if (
            response.status === 409 &&
            result &&
            typeof result === "object" &&
            result.spreadsheetConflict === true
          ) {
            conflictRef.current = true;
            if (mountedRef.current) setSaveState("conflict");
            return;
          }
          if (!response.ok) {
            throw new Error(
              typeof result?.error === "string"
                ? result.error
                : "Unable to save spreadsheet.",
            );
          }
          if (typeof result?.spreadsheet?.revision === "number") {
            revisionRef.current = result.spreadsheet.revision;
          }
          if (
            mountedRef.current &&
            snapshotVersion === latestVersionRef.current
          ) {
            setSaveState("saved");
          }
        })
        .catch((error) => {
          console.error("Unable to save spreadsheet", error);
          if (mountedRef.current) setSaveState("error");
        });
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [changeVersion, content, spreadsheetId, title]);

  const markChanged = useCallback(() => {
    latestVersionRef.current += 1;
    setChangeVersion(latestVersionRef.current);
  }, []);

  function updateTitle(nextTitle: string) {
    if (conflictRef.current) return;
    setTitle(nextTitle.slice(0, 200));
    markChanged();
  }

  function updateCell(reference: string, nextValue: string) {
    if (conflictRef.current) return;
    const value = nextValue.slice(0, MAX_SPREADSHEET_CELL_LENGTH);
    setContent((current) => {
      const cells = { ...current.cells };
      if (value) cells[reference] = value;
      else delete cells[reference];
      return { ...current, cells };
    });
    markChanged();
  }

  function focusCell(rowIndex: number, columnIndex: number) {
    const boundedRow = Math.max(0, Math.min(content.rows - 1, rowIndex));
    const boundedColumn = Math.max(
      0,
      Math.min(content.columns - 1, columnIndex),
    );
    const reference = spreadsheetCellReference(boundedRow, boundedColumn);
    setSelectedCell(reference);
    window.requestAnimationFrame(() => {
      document.getElementById(`spreadsheet-cell-${reference}`)?.focus();
    });
  }

  function handleCellPaste(
    event: React.ClipboardEvent<HTMLInputElement>,
    reference: string,
  ) {
    if (conflictRef.current) { event.preventDefault(); return; }
    const text = event.clipboardData.getData("text/plain");
    if (!text.includes("\t") && !/[\r\n]/.test(text)) return;
    event.preventDefault();
    setContent((current) => pasteSpreadsheetText(current, reference, text));
    markChanged();
  }

  function addRows() {
    setContent((current) => ({
      ...current,
      rows: Math.min(MAX_SPREADSHEET_ROWS, current.rows + 10),
    }));
    markChanged();
  }

  function addColumns() {
    setContent((current) => ({
      ...current,
      columns: Math.min(MAX_SPREADSHEET_COLUMNS, current.columns + 2),
    }));
    markChanged();
  }

  return (
    <main className="flex h-dvh min-h-[34rem] w-full flex-col overflow-hidden bg-[var(--surface)]">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 sm:px-5">
        <Brand href="/dashboard" />
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="spreadsheet-title" className="sr-only">
            Spreadsheet title
          </label>
          <input
            readOnly={saveState === "conflict"}
            id="spreadsheet-title"
            value={title}
            onChange={(event) => updateTitle(event.target.value)}
            onBlur={() => {
              if (!title.trim()) updateTitle("Untitled Spreadsheet");
            }}
            maxLength={200}
            className="w-full max-w-2xl rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold outline-none hover:border-[var(--border)] focus:border-[var(--border-strong)] focus:bg-[var(--surface)] focus:ring-2 focus:ring-[var(--ring)]"
          />
          <div className="flex items-center gap-2 px-2 text-[0.68rem] text-[var(--muted)]">
            <span className="rounded-full border border-[var(--border)] px-1.5 py-0.5 font-semibold uppercase tracking-[0.1em]">
              Spreadsheet
            </span>
            <span aria-live="polite">{saveLabel(saveState)}</span>
            {saveState === "error" ? (
              <button
                type="button"
                onClick={markChanged}
                className="font-semibold text-[var(--accent-strong)] underline underline-offset-2"
              >
                Retry
              </button>
            ) : null}
          </div>
        </div>
        <Link
          href="/dashboard"
          className="secondary-button rounded-md px-3 py-2 text-xs font-semibold"
        >
          Dashboard
        </Link>
        <UserMenu user={currentUser} />
      </header>

      {saveState === "conflict" ? (
        <ConflictRecovery
          getText={() => `${title}\n\n${Array.from({ length: content.rows }, (_, row) =>
            Array.from({ length: content.columns }, (_, column) =>
              content.cells[spreadsheetCellReference(row, column)] ?? "",
            ).join("\t"),
          ).join("\n")}`}
          onReload={async () => { window.location.reload(); }}
        />
      ) : null}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2">
        <label htmlFor="selected-cell-value" className="sr-only">
          Value or formula for {selectedCell}
        </label>
        <span className="inline-flex h-8 min-w-14 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-subtle)] px-2 font-mono text-xs font-semibold">
          {selectedCell}
        </span>
        <span aria-hidden="true" className="font-serif text-sm italic text-[var(--muted)]">
          fx
        </span>
        <input
          readOnly={saveState === "conflict"}
          id="selected-cell-value"
          value={content.cells[selectedCell] ?? ""}
          onChange={(event) => updateCell(selectedCell, event.target.value)}
          maxLength={MAX_SPREADSHEET_CELL_LENGTH}
          placeholder="Enter a value or formula"
          className="h-8 min-w-48 flex-1 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 font-mono text-xs outline-none focus:ring-2 focus:ring-[var(--ring)]"
        />
        <button
          type="button"
          disabled={saveState === "conflict"}
          onClick={() => updateCell(selectedCell, "")}
          className="secondary-button rounded-md px-2.5 py-2 text-xs font-medium"
        >
          Clear cell
        </button>
        <button
          type="button"
          onClick={addRows}
          disabled={saveState === "conflict" || content.rows >= MAX_SPREADSHEET_ROWS}
          className="secondary-button rounded-md px-2.5 py-2 text-xs font-medium disabled:opacity-50"
        >
          Add 10 rows
        </button>
        <button
          type="button"
          onClick={addColumns}
          disabled={saveState === "conflict" || content.columns >= MAX_SPREADSHEET_COLUMNS}
          className="secondary-button rounded-md px-2.5 py-2 text-xs font-medium disabled:opacity-50"
        >
          Add 2 columns
        </button>
        <span className="hidden text-[0.68rem] text-[var(--muted)] xl:inline">
          Try =A1+B1 or =SUM(A1:A5)
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-auto" data-spreadsheet-grid>
        <table className="border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-20">
            <tr>
              <th className="sticky left-0 z-30 h-8 w-12 min-w-12 border-r border-b border-[var(--border-strong)] bg-[var(--surface-subtle)]" />
              {columnLabels.map((label) => (
                <th
                  key={label}
                  scope="col"
                  className="h-8 w-32 min-w-32 border-r border-b border-[var(--border)] bg-[var(--surface-subtle)] px-2 text-center font-mono font-semibold text-[var(--muted)]"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: content.rows }, (_, rowIndex) => (
              <tr key={rowIndex}>
                <th
                  scope="row"
                  className="sticky left-0 z-10 h-8 w-12 min-w-12 border-r border-b border-[var(--border)] bg-[var(--surface-subtle)] text-center font-mono font-medium text-[var(--muted)]"
                >
                  {rowIndex + 1}
                </th>
                {columnLabels.map((_, columnIndex) => {
                  const reference = spreadsheetCellReference(
                    rowIndex,
                    columnIndex,
                  );
                  const selected = selectedCell === reference;
                  const rawValue = content.cells[reference] ?? "";
                  const visibleValue =
                    selected || !rawValue.startsWith("=")
                      ? rawValue
                      : calculatedValues[reference] ?? "";
                  return (
                    <td
                      key={reference}
                      className="h-8 w-32 min-w-32 border-r border-b border-[var(--border)] bg-[var(--surface)] p-0"
                    >
                      <input
                        readOnly={saveState === "conflict"}
                        id={`spreadsheet-cell-${reference}`}
                        aria-label={`Cell ${reference}`}
                        value={visibleValue}
                        onFocus={() => setSelectedCell(reference)}
                        onChange={(event) =>
                          updateCell(reference, event.target.value)
                        }
                        onPaste={(event) => handleCellPaste(event, reference)}
                        onKeyDown={(event) => {
                          if (event.key !== "Enter") return;
                          event.preventDefault();
                          focusCell(
                            rowIndex + (event.shiftKey ? -1 : 1),
                            columnIndex,
                          );
                        }}
                        maxLength={MAX_SPREADSHEET_CELL_LENGTH}
                        className={`h-full w-full border-0 bg-transparent px-2 font-mono outline-none ${
                          selected
                            ? "relative z-[1] ring-2 ring-inset ring-[var(--accent-strong)]"
                            : "focus:ring-2 focus:ring-inset focus:ring-[var(--accent-strong)]"
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
