# Document action layout

## Current recommendation

Thido's document editor should follow the familiar Google Docs hierarchy without copying Google branding:

1. A compact identity row contains the Thido home link, editable document title, save state, comments control, Share action, and account menu.
2. A conventional menu bar contains only implemented categories: **File**, **Edit**, **View**, **Insert**, and **Format**.
3. A compact formatting toolbar exposes frequent actions as recognizable icons or standard controls with accessible labels and tooltips.
4. The document canvas begins below the editor chrome and expands when comments are hidden.

## File operations

Standalone **Download** and **More** buttons are removed. The **File** menu contains:

- Import Word, when editing is allowed
- Version history, when the viewer has editing access
- Download as Microsoft Word
- Download as PDF
- Print

This keeps downloads discoverable in the place users expect while avoiding an unconventional document-action cluster.

## Formatting controls

The toolbar uses icons for undo, redo, bold, italic, strikethrough, links, bulleted lists, numbered lists, checklists, and block quotes. It uses a standard paragraph-style selector for normal text and headings. Visible labels such as **List**, **Checkbox list**, **Insert image**, and **Table actions** do not occupy toolbar space; their accessible names and tooltips remain available.

Less-frequent insertion and formatting commands remain available through **Insert** and **Format**. Table cell operations also remain available through the table right-click menu.

## Interaction and accessibility

- Menus close on outside click and Escape.
- Opening a menu moves focus to its first action.
- Arrow keys, Home, and End move between menu actions.
- Every icon-only control has an accessible label and tooltip.
- The comments control exposes its expanded state and uses the Google Docs-style discussion shortcut, `Ctrl/⌘ + Alt + Shift + A`.
- Unavailable editing menus are omitted for viewers instead of presenting actions that cannot succeed.
