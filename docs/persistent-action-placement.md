# Placement of New document and feature feedback

## Recommendation

The two bottom-corner actions should not remain globally visible.

They are useful actions, but their current placement gives them more visual priority than the work a user is doing. The problem is clearest immediately after creating a document: the interface offers **New document** again while the user is trying to name or edit the document they just created. On smaller screens, both controls also consume scarce space over the application rather than participating in its layout.

Both actions should live at the top of the interface, with route-aware visibility.

## New document

Keep the full **New document** chooser in the dashboard/library header, where creating another file is a natural primary action. The dashboard already renders it there, so the current global fixed copy is redundant on that page.

Do not show it on:

- the new-document landing page;
- the document wizard;
- a document editor;
- a spreadsheet editor;
- feedback, settings, administrative, legal, error, or access-denied pages.

On creation and editing routes, the user already has a clear path back to the dashboard through the Thido brand. Starting another file is available one step away without competing with the current task.

If later usage data shows that frequent multi-document creators need faster access from editors, add a compact **Create** item to a top application menu. It should still be suppressed while an unsaved creation flow is in progress and should not return as a floating bottom control.

## Want a feature?

Retain the feedback conversation, but replace the long floating **Want a feature? Suggest it here** button with a quieter top-right entry named **Send feedback** or **Suggest a feature**.

The best location is the account menu because it already appears in the top-right header on authenticated document, spreadsheet, dashboard, settings, feedback, and administrative screens. This keeps feedback consistently discoverable without making it look like a primary action.

The entry should:

- open the existing in-place feedback panel;
- be hidden on the dedicated `/feedback` page;
- retain the current page path as optional feedback context;
- remain keyboard accessible and return focus to its menu trigger when closed;
- use a short label rather than the current promotional sentence.

A standalone top-right feedback icon is a reasonable alternative if beta feedback volume is a higher priority than header simplicity. It should be compact, have an explicit accessible label, and sit with the account/help controls rather than floating over page content.

## Route behavior

| Context | New document | Feedback |
| --- | --- | --- |
| Dashboard/library | Full chooser in the top header | Account-menu item |
| New-document landing or wizard | Hidden | Account-menu item |
| Document or spreadsheet editor | Hidden | Account-menu item |
| Settings | Hidden | Account-menu item |
| Feedback page | Hidden | Hidden; the page is already the destination |
| Admin pages | Hidden | Account-menu item or direct admin-feedback link |
| Signed-out and public-share pages | Hidden | Hidden |

## Implementation scope

This is a small-to-medium refactor:

1. Remove the root-layout fixed actions supplied by `SignedInPageActions`.
2. Keep the dashboard's existing top-header `NewDocumentMenu` as the canonical creation control.
3. Separate the feedback panel from its current fixed launcher so `UserMenu` can open it from a regular menu item.
4. Preserve the feedback panel's lazy loading, focus management, page context, and `/feedback` suppression.
5. Verify headers and menus at desktop and 390 px, especially editors where the floating controls currently compete with the document.

No database migration or API change is required.

## Bottom line

The user's current task should own the screen. Creation belongs at the top of the library, and feedback belongs in the top-right account/help area. Neither action needs to float over every signed-in page.
