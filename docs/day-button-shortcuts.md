# Day slash command

Type `/day` at the start of a top-level line and press **Enter** to open the date picker. Add a recognizable date before pressing Enter to apply it immediately: `/day tomorrow`, `/day Oct 13`, or `/day 2026-10-13`.

The command uses the same date guessing as the calendar button. Ambiguous dates open the picker. Cancelling keeps the original line; applying removes the `/day` prefix and preserves the remaining text. Undo restores the original line.

Day labels use abbreviated months and weekdays, with a numeric day: **Oct 13 Tue**. The underlying full date is retained for year/month/week grouping and saving. The font is smaller and has no underline.

The command applies to a single top-level line outside lists and tables. No modifier-key shortcut is assigned.
