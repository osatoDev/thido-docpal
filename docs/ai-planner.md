# AI planner

Each person has one plan, at `/plan`: a document linked from `User.planDocumentId` (`src/lib/plan.ts`). Signing in opens it, and the first visit creates it, adding today's day header and an empty checklist in the browser so the date is local. Tasks sit under day headers (`/day`, the calendar button). The planner bar above the plan does two things. Older documents, from before the pivot, open from **Older documents** in the account menu and have no planner bar.

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

## Requests: "find me…", "list 10…"

When an entry asks Thido itself to find, research, suggest or list something ("List 10 cinemas near Berlin Naija Foodie, I'm driving"), the reading step labels it a **request** instead of a task, and that credit is refunded.

1. The planner bar sends the request, its day and that day's tasks to `POST /api/documents/[id]/request`.
2. `answerPlanRequest` (`src/lib/ai/planner.ts`) runs Claude with the web search tool (at most 3 searches, located by the user's time zone) and a structured answer: a summary and up to 10 options, each with details, an optional start time, a task line and a source URL. A paused server-tool turn is sent back so the search resumes, up to 4 times.
3. A source URL is kept only if the web search actually returned it.
4. The answer appears under the bar. **Add to plan** writes that option as a task under the day; nothing is added otherwise.

A request costs 3 credits, refunded on failure. It uses the basic `web_search_20250305` tool: in a live test the dynamic-filtering `web_search_20260209` found better sources but read about 4 times the input tokens (around $0.85 per request on Sonnet 5, against $0.22).

## Feedback on a day's plan

- **Review my day** reviews the day where the cursor is, or today if the cursor is not under a day. It always runs.
- **Automatic feedback.** After a task is added, the server may review that day without being asked. It does so at random (a 40% chance per entry) until it reaches the user's daily cap: **Settings → Automatic plan feedback**, default 3, or Off. The cap counts per local calendar day. A skipped review costs nothing, and automatic reviews never show an error.

Feedback is 2–4 sentences and is stored in the `PlanFeedback` table. It appears under the bar and can be dismissed.

## Not yet built: phone reminders

Phone reminders are planned for the next iteration. The leading `HH:MM` in task text gives a future reminder scheduler a time to read.
