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
- headings 1–6;
- bold, italic, underline, highlight, strikethrough, superscript, subscript, and
  code-style text where Word exposes equivalent semantic markup;
- safe HTTP(S) and email links;
- unordered and ordered lists;
- small tables, including basic merged-cell spans;
- blockquotes and horizontal rules when Mammoth can identify them;
- embedded images that Sharp can decode. Imported images are normalized to PNG
  and moved into Thido's private document-image store.

The following Word structures are not represented faithfully yet:

- advanced table layout, exact column widths, borders, cell colors, and other
  decorative table styling are simplified;
- headers, footers, page numbers, columns, sections, page setup, bookmarks,
  citations, equations, drawings, charts, text boxes, footnotes, and endnotes do
  not retain their original document semantics;
- Word checkbox controls and checkbox-like glyphs are not inferred as semantic
  Thido checklists;
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
safe links, basic tables, the eight built-in unordered-list markers, stored
document images, headings 1–6, text alignment, paragraph indentation, font
family, font size, text color, highlight color, line spacing, paragraph spacing,
page breaks, and named Thido bookmarks. Safe custom bullet symbols use a visible
text-prefix fallback in Word because they are not part of the document's fixed
numbering definitions. Inserted Thido tables of contents become indented heading lists,
and Thido footnotes become numbered notes with superscript references; these are
portable fallbacks rather than native Word TOC or footnote fields. Thido
checklist items are represented with checked or unchecked box characters, and
completed-item strikethrough is preserved when that checklist style is selected;
importing that Word file again retains their text but does not reconstruct
semantic checklist state. The Thido document title is written as Word file
metadata and used for the filename; it is not duplicated as a body heading.

PDF export renders the document title, headings 1–6, bold, italic, underline,
strikethrough, font family, font size, text color, code-style text, alignment,
indentation, line spacing, paragraph spacing, page breaks, clickable links,
lists including safe custom bullet symbols, both checklist completion styles,
basic tables, blockquotes, horizontal rules, tables of
contents, numbered footnotes, and stored images onto A4 pages. Named bookmark
markers are omitted from PDF because the current PDF exporter does not create
internal anchor destinations. Highlight and superscript/subscript remain visible
in the editor and Word export but currently fall back to plain text in PDF. Browser printing
remains available when a user needs printer-specific controls.

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

Native Word footnote/TOC fields, richer table styling, semantic Word checklist
conversion, comments, and tracked changes require separate mappings and must
not be treated as side effects of basic `.docx` conversion.
