# AI planner

Thido documents already group tasks under day headers (`/day`, the calendar button). The AI planner adds a bar above the document that does two things.

## Add a task in plain language

Type something like `Dentist next Tuesday 3pm` and press **Add**.

1. The editor sends the text, the user's local date and time zone to `POST /api/documents/[id]/schedule`.
2. The server asks Claude (the user's chosen model in Settings) for a date, an optional 24-hour time and the task text (`src/lib/ai/planner.ts`). An entry with no date goes on today. A genuinely ambiguous date comes back as a one-line question, shown under the bar, and nothing is written.
3. The browser writes the task into the document (`src/lib/scheduleInsert.ts`):
   - If the day exists, the task joins that day's last checklist. A timed task is placed in time order among the timed tasks there.
   - If the day does not exist, a new day header and checklist are created in date order between the existing days, or at the end of the document.
   - A time is written as a prefix, for example `15:00 Dentist`.

Because the edit happens in the editor, it autosaves, undoes and resolves conflicts like any typed change.

Each entry uses one AI credit. If Claude fails, the credit is refunded.

## Feedback on a day's plan

- **Review my day** reviews the day where the cursor is, or today if the cursor is not under a day. It always runs.
- **Automatic feedback.** After a task is added, the server may review that day without being asked. It does so at random (a 40% chance per entry) until it reaches the user's daily cap: **Settings → Automatic plan feedback**, default 3, or Off. The cap counts per local calendar day. A skipped review costs nothing, and automatic reviews never show an error.

Feedback is 2–4 sentences and is stored in the `PlanFeedback` table. It appears under the bar and can be dismissed.

## Not yet built: phone reminders

Phone reminders are planned for the next iteration. The leading `HH:MM` in task text gives a future reminder scheduler a time to read.
