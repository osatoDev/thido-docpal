# Document import and export

## User workflow

Authenticated document members can open **File** in the editor to:

- download the current document as an editable Word `.docx` file;
- download a server-generated PDF;
- use **Import document…** for Word `.docx` and `.doc`, OpenDocument `.odt`,
  Rich Text `.rtf`, Markdown `.md`, and plain text `.txt` when they have edit
  access.

Users can also drag any of those supported files from Finder or File Explorer
onto a blank editable Thido document. Drag-and-drop deliberately does not
replace a document that already has meaningful content; those imports stay
behind the explicit replacement flow in **File**.

Import replaces the current document title and body after an explicit browser
confirmation. The previous content remains recoverable in **Version history**.
An import is rejected if another tab, collaborator, or AI action changed the
document after the import began.

Markdown files become ordinary editable Thido content. Thido preserves headings,
paragraphs, emphasis, safe links, lists, code blocks, blockquotes, horizontal
rules, and basic tables supported by the shared editor schema. The first
meaningful heading becomes the document title; when no heading exists, Thido
uses the upload filename. Raw HTML is sanitized, and embedded external images
are omitted rather than loaded into a document.

Plain-text files become literal editable paragraphs. Thido recognizes UTF-8,
UTF-16 byte-order marks, and a Windows-1252 fallback, while rejecting files
with enough binary control bytes to indicate that a non-text file was merely
renamed to `.txt`.

When pasted plain text has a consistent tab-separated, Markdown, CSV, or
aligned-column structure, Thido asks whether to convert it into a table. The
first row becomes the header when accepted. Choosing **Keep as text**, pressing
Escape, or dismissing the prompt preserves the pasted lines as plain text.

## Import fidelity contract

Import fidelity depends on the source format:

- `.docx` continues through Mammoth and has the richest supported mapping,
  including privately stored embedded images that Sharp can decode.
- `.odt` and `.rtf` are parsed into HTML without attachments, comments,
  headers, footers, or notes; the result then goes through Thido's HTML
  allowlist and editor-schema conversion. Basic paragraphs, headings, lists,
  emphasis, links, and tables can survive when the source parser exposes them,
  but images and document-specific layout are omitted.
- Legacy binary `.doc` import intentionally extracts editable body text. It can
  simplify formatting and omit images, and the successful import displays that
  warning rather than implying full fidelity.
- `.md` and `.txt` follow their direct text conversion paths and never execute
  source markup.

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
numbering definitions. The document's Narrow, Standard, or Wide side-margin
setting is applied to the Word section. Inserted Thido tables of contents become
indented heading lists, and Thido footnotes become numbered notes with
superscript references; these are portable fallbacks rather than native Word
TOC or footnote fields. Thido
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
in the editor and Word export but currently fall back to plain text in PDF. The
selected side-margin preset is also applied to PDF output and browser printing.
Browser printing remains available when a user needs printer-specific controls.

Comments, private comment anchors, AI metadata, collaborator details, and
version history are excluded from both export formats.

## Limits and security

- `.docx` and `.odt` uploads are limited to 15 MB.
- Legacy `.doc` uploads are limited to 10 MB.
- `.rtf` uploads are limited to 5 MB.
- Markdown and plain-text uploads are limited to 2 MB.
- Each embedded image is limited to 8 MB before normalization.
- Imports are limited to ten per user per hour; exports are limited to twenty.
- Mammoth's raw HTML, structured-office generated HTML, and rendered Markdown
  HTML are never passed directly to the editor. Thido allowlists its supported
  structural tags and attributes, removes executable markup, and accepts only
  image URLs created by Thido during that import.
- External file access is disabled during Word conversion.
- `.doc`, `.docx`, `.odt`, and `.rtf` uploads must match their expected binary
  signatures. Structured-office parsing has a ten-second cancellation signal,
  a 32 MB decompression ceiling, and a 2,000-entry archive ceiling.
- The office parser's unused PDF dependency is pinned to a patched release;
  PDF remains outside the document-import allowlist.
- Export and import routes enforce the document's existing view/edit
  permissions.

## Deliberately separate future work

Native Word footnote/TOC fields, richer table styling, semantic Word checklist
conversion, comments, tracked changes, imported images from `.odt`/`.rtf`, and
stronger process isolation for complex legacy document parsing require separate
work and must not be treated as side effects of broad extension support.
