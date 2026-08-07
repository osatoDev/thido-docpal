# Document action layout

## Recommendation

Yes: the current **File** label should become **Download** if its main job is to offer Word and PDF downloads.

The existing menu mixes two different intentions:

- **Download Word** and **Download PDF** create copies of the current document.
- **Import Word** replaces the current document.

That makes **File** technically defensible, but vague. It also leaves **Print** outside the menu even though printing, exporting, and importing are closely related file operations.

The controls should live in a deliberate document-action toolbar in the document header, rather than appearing as a row of equally weighted buttons beside the page. A full desktop-style menu bar such as **File / Edit / View / Insert** would be too heavy for the current feature set; Thido does not yet have enough actions in each category to justify that structure.

## Current hierarchy

Keep the document identity and collaboration action on the title row, then place file operations in a compact group at the conventional upper-left edge of the document workspace:

`[Document title] [Saved]                              [Share]`

`[Download ▾] [More ▾]`

- **Share** remains the strongest, most visible action for users who can manage access.
- **Download** is a clearly labelled dropdown containing **Word (.docx)** and **PDF**.
- **More** contains lower-frequency document operations:
  - Print
  - Import Word, when the user can edit
  - Version history, when the user can edit

For view-only or comment-only users, hide unavailable actions rather than showing an incomplete menu. On narrow screens, keep the same left-aligned file group and retain Share beside the document identity where permitted.

## Why this is clearer

This arrangement:

- names the visible action after the user's goal;
- separates frequent collaboration from occasional file management;
- reduces four adjacent, equally styled controls to a readable hierarchy;
- puts familiar file and history operations where users conventionally scan first: the upper-left of the document workspace;
- keeps collaboration visually distinct on the right;
- scales to mobile without wrapping controls into an accidental second row;
- avoids introducing a traditional menu bar before the product needs one.

## Interaction details

The dropdowns should close on outside click and `Escape`, return focus to their trigger, expose proper menu semantics, and support keyboard navigation. Import should retain its replacement warning. Download links should state their formats directly, and Print should continue to open the browser print dialog.
