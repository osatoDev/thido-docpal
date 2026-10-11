# Day button shortcut ideas

My preferred candidate is **Ctrl + Alt + Shift + D** on Windows/Linux and **⌘ + Option + Shift + D** on Mac: D is easy to remember for “day,” and the extra modifiers make it a distinctive editor action. These are proposals, not verified conflict-free bindings; test browser, operating-system, and keyboard-layout behavior before choosing one.

| Idea | Benefit | Tradeoff |
| --- | --- | --- |
| Ctrl + Alt + Shift + D / ⌘ + Option + Shift + D | A more distinctive combination | Four keys are harder to press and remember. |
| A customizable shortcut | Lets frequent users choose a comfortable combination | Requires shortcut settings and conflict handling. |
| Type `/day` at the start of a line | Discoverable alternative with no modifier chord | Requires a slash-command interface, which this change does not add. |

Whichever shortcut is chosen, it should run exactly the calendar button’s action: infer the date from the current line, apply immediately when the guess is clear, and open the date picker otherwise. Show the chosen keys in the calendar tooltip, and keep the shortcut scoped to the editable document.

No shortcut has been assigned in this change.
