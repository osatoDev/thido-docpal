# Word import and document export

## User workflow

Authenticated document members can open **File** in the editor to:

- download the current document as an editable Word `.docx` file;
- download a server-generated PDF;
- import a Word `.docx` file when they have edit access.

Import replaces the current document title and body after an explicit browser
confirmation. The previous content remains recoverable in **Version history**.
An import is rejected if another tab, collaborator, or AI action changed the
document after the import began.

## Import fidelity contract

Thido preserves structures that exist in its current TipTap schema:

- paragraphs and empty paragraphs;
- headings 1–3;
- bold, italic, strikethrough, and code-style text where Word exposes equivalent
  semantic markup;
- unordered and ordered lists;
- blockquotes and horizontal rules when Mammoth can identify them;
- embedded images that Sharp can decode. Imported images are normalized to PNG
  and moved into Thido's private document-image store.

The following Word structures are not represented faithfully yet:

- hyperlinks are imported as visible text;
- tables are flattened to supported text content;
- heading levels below level 3 lose their distinct level;
- headers, footers, page numbers, columns, sections, page setup, bookmarks,
  citations, equations, drawings, charts, text boxes, footnotes, and endnotes do
  not retain their original document semantics;
- comments and tracked changes are not imported into Thido comments or
  suggestions;
- fonts, colors, text sizes, alignment, indentation, spacing, and most decorative
  styling are not retained;
- the exact unordered-list marker chosen in Word may fall back to Thido's
  default disc marker.

The import response returns up to eight conversion notes. The editor displays
those notes after a successful import so loss is not silent.

## Export fidelity contract

Word export preserves the Thido structures listed as supported above, including
disc, circle, and square unordered-list markers and stored document images. The
Thido document title is written as Word file metadata and used for the filename;
it is not duplicated as a body heading.

PDF export renders the document title, supported text formatting, lists,
blockquotes, horizontal rules, and stored images onto A4 pages. It is intended
as a stable reading copy. Browser printing remains available when a user needs
printer-specific controls.

Comments, private comment anchors, AI metadata, collaborator details, and
version history are excluded from both export formats.

## Limits and security

- Word uploads are limited to 15 MB.
- Each embedded image is limited to 8 MB before normalization.
- Imports are limited to ten per user per hour; exports are limited to twenty.
- Mammoth's raw HTML output is never passed directly to the editor. Thido
  allowlists its supported structural tags and attributes, removes executable
  markup, and accepts only image URLs created by Thido during that import.
- External file access is disabled during Word conversion.
- Export and import routes enforce the document's existing view/edit
  permissions.

## Deliberately separate future work

Adding links, tables, and footnotes to the editor should be followed by
round-trip coverage for those nodes. Importing Word comments and tracked changes
requires a separate mapping to Thido's human suggestion model and must not be
treated as a side effect of basic `.docx` conversion.

