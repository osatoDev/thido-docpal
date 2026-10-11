# Conflict recovery

When a newer revision exists, Thido rejects the stale save and pauses editing. The user’s current content remains visible.

## User flow

1. Select **Review recovery options** in the conflict banner.
2. Select **Copy my text** or **Download my text** to preserve the current title and content. Downloads come from the unsaved editor state, not the server. Spreadsheet exports contain raw cell values and formulas, separated by tabs and rows.
3. Check the saved file or paste the copied text somewhere safe. Both actions preserve plain text only: formatting, images, and comments are excluded. The dialog states this limitation explicitly.
4. Confirm **I saved what I need, or I don’t need this unsaved copy.** Reload remains disabled until this is checked. Choosing **Stay here** or pressing Escape cancels recovery without replacing content.
5. Select **Reload latest version**, then manually reapply the desired changes to the latest copy. This does not merge or force-overwrite another user’s work.

Document reload errors keep the dialog and current copy in place, with an error and a retry action. Spreadsheet recovery uses a full page reload. Reopening the dialog resets the confirmation. Download initiation is not treated as proof that the file was saved successfully.

## Scope and remaining limitations

There is no automatic merge, durable local draft, or full-fidelity recovery copy. Users still need to preserve text explicitly before closing the tab. A future recovery flow should preserve formatting and images too. Ordinary Word/PDF exports continue to use server content and are not backups of unsaved work.

## Implementation

- [Shared recovery dialog](../src/components/conflicts/ConflictRecovery.tsx)
- [Document editor](../src/components/editor/TiptapEditor.tsx)
- [Spreadsheet editor](../src/components/spreadsheets/SpreadsheetEditor.tsx)
- [Document recovery test](../e2e/autosave.spec.ts)
- [Spreadsheet recovery test](../e2e/conflict-recovery.spec.ts)

## Verification

Type checking and targeted ESLint pass. Local Playwright tests passed for document download, cancellation, blocked reload before confirmation, failed reload with retained edits, successful retry, and resumed editing. The spreadsheet test passed at 390 px, covering formula preservation, paused editing, Escape cancellation, dialog bounds, and reload. Tests inject conflict responses; real simultaneous-edit recovery and production deployment remain unverified.
