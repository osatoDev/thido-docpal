# Autosave settings and blank first print page

## Autosave

Settings now includes **Document autosave delay**, with 5, 15, 30, 60, 120, and 300 second options. The default remains 120 seconds. The preference is saved to the signed-in user's account and loaded when opening a document. Reopen documents already open in other tabs to pick up a change.

This is a delay after the last edit: each edit restarts the countdown. **Save now** still saves immediately. The countdown and progress bar use the chosen delay.

Deploy the migration `20260928120000_add_autosave_delay` before deploying this code. It adds a non-null integer with a 120-second default. No production migration or deployment was performed in this task.

## Why printing might start with a blank page

The existing stylesheet assigned a named print page (`thido-document`) to containers inside the page, while the outer body retained its full-height flex layout. A transition from the default page to a named page is a plausible source of an unwanted page break; flex pagination can also affect where content starts.

The print stylesheet now selects the named page on the root HTML element and changes the document's body to normal block flow for printing. Document margins and explicit page breaks remain supported.

This is a defensive fix, not a confirmed diagnosis of the reported document. A standalone Chromium PDF fixture containing the document wrappers, title, and a paragraph printed on page one both before and after the change. Reproducing the original issue with the affected document and browser is still required. If it persists, check the document's leading page breaks, large first images or tables, browser, paper size, and print-preview settings.

## Verification

- Prisma Client generated successfully.
- TypeScript check passed.
- Targeted ESLint check passed with two pre-existing unused-variable warnings in the settings page.
- Settings API tests cover persistence, invalid delays, and authentication.
- Added a browser regression scenario for selecting a delay, reloading settings, and saving after the chosen countdown; this scenario has not been run.
- Standalone Chromium print fixture has its title and content on page one. Authenticated printing and cross-browser print previews remain unverified.
