# Document action layout

## Current recommendation

Thido's document editor should follow the familiar Google Docs hierarchy without copying Google branding:

1. A compact identity row contains the Thido home link, editable document title, save state, comments control, Share action, and account menu.
2. A conventional menu bar contains only implemented categories: **File**, **Edit**, **View**, **Insert**, **Format**, and **Tools**.
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

The toolbar uses icons for undo, redo, bold, italic, underline, strikethrough, links, bulleted lists, numbered lists, checklists, and block quotes. It uses standard paragraph-style and zoom selectors. Visible labels such as **List**, **Checkbox list**, **Insert image**, and **Table actions** do not occupy toolbar space; their accessible names and tooltips remain available.

Less-frequent insertion and formatting commands remain available through **Insert** and **Format**. Table cell operations also remain available through the table right-click menu.

## Priority 0 menu commands

The first expansion beyond the original menu bar adds high-frequency document utilities that are familiar from Google Docs:

- **Edit → Find and replace** searches editor text across inline formatting, supports case-sensitive matching, navigates matches, and can replace one or all matches.
- **Insert → Link** opens the same safe-link control as the toolbar.
- **Insert → Horizontal line** inserts a structural divider into the document.
- **Format → Clear formatting** removes inline marks and returns selected blocks to their default structure.
- **Tools → Word count** reports words, characters, and characters excluding spaces for the full document and for the current selection when one exists.

This is intentionally a P0 set: every visible command is implemented and useful in ordinary editing. Spelling and language controls remain out of the menu until Thido has an explicit, documented behavior for them.

## Priority 0 expansion

The next expansion adds sixteen implemented commands while retaining the same six-menu hierarchy:

- **Edit:** Select all.
- **View:** 75%, 100%, 125%, and 150% document zoom.
- **Insert:** Page break.
- **Format:** Underline, highlight, inline code, superscript, subscript, code block, align left, align center, align right, justify, increase indent, and decrease indent.

Underline is also present in the compact toolbar, while zoom uses a compact selector. The longer **Format** menu is viewport-bounded and scrollable so it remains usable on smaller screens.

## Authoring expansion

The next implemented authoring bundle extends the familiar controls without adding new top-level menus:

- **View:** a collapsible heading-derived document outline with click-to-navigate entries.
- **Insert:** localized current-date and current-time insertion.
- **Format:** Heading 4–6, four line-spacing presets, paragraph space before/after, and uppercase, lowercase, and title-case conversion for the selection.
- **Toolbar:** font family, font size, text color, and multi-color highlight selectors.

Typography, color, highlight, line spacing, paragraph spacing, and deeper headings persist in the shared editor schema and public document rendering. Compatible styling is also carried into Word and PDF export; Word re-import may flatten decorative styling because the import conversion intentionally prioritizes semantic structure.

## Interaction and accessibility

- Menus close on outside click and Escape.
- Opening a menu moves focus to its first action.
- Arrow keys, Home, and End move between menu actions.
- Every icon-only control has an accessible label and tooltip.
- Find and replace, link insertion, clear formatting, and word count support the displayed keyboard shortcuts.
- The comments control exposes its expanded state and uses the Google Docs-style discussion shortcut, `Ctrl/⌘ + Alt + Shift + A`.
- The document outline is labelled as navigation, has a dedicated close control, and uses ordinary buttons so it remains keyboard accessible.
- Unavailable editing menus are omitted for viewers instead of presenting actions that cannot succeed.
