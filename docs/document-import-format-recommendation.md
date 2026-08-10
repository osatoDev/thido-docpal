# Document import format recommendation

## Recommendation

Yes—Thido should accept more mainstream word-processing formats. The original **Import Word (.docx)…** label accurately described the first implementation but made the feature feel narrower than a general document editor should.

The product should not promise “any Word file,” because that suggests universal and lossless compatibility. A better promise is:

> **Import document…**  
> Supports Word (`.docx`, `.doc`), OpenDocument (`.odt`), Rich Text (`.rtf`), plain text (`.txt`), and Markdown (`.md`).

The format list should be visible in the picker or import dialog, and the existing fidelity warning should remain. Microsoft itself documents that conversion between `.docx` and `.odt` can change formatting or unsupported features, so Thido should promise editable content—not pixel-perfect reproduction. See [Microsoft's ODT compatibility guidance](https://support.microsoft.com/en-US/Word/differences-between-the-opendocument-text-odt-format-and-the-word-docx-format).

## Implemented scope

Thido now implements the recommended product surface:

- The File menu has one **Import document…** action.
- The picker, drag-and-drop surface, API, limits, filename-derived titles, tests,
  and observability share one format definition.
- `.docx`, `.doc`, `.odt`, `.rtf`, `.md`, and `.txt` are accepted.
- File signatures are checked for the binary/structured formats instead of
  trusting the extension alone.
- `.docx` remains on Mammoth; `.md` and `.txt` use direct sanitized/literal text
  paths; `.odt` and `.rtf` use a bounded structured-office parser; and `.doc`
  uses a body-text extractor with an explicit fidelity warning. Mammoth's
  documented scope remains `.docx` conversion. See the [Mammoth project documentation](https://github.com/mwilliamson/mammoth.js/).

Macro-enabled files, templates, Pages, Google pointer files, and PDF remain
outside the advertised import contract.

## Recommended support order

| Priority | Formats | Treatment |
| --- | --- | --- |
| Implemented | `.docx`, `.md` | Keep the sanitized, revision-aware import paths. |
| Implemented | `.txt` | Decode bounded text, normalize line endings, and create paragraphs without interpreting markup. |
| Implemented with bounded in-process parsing | `.odt`, `.rtf` | Convert to HTML, sanitize, and map into the TipTap schema; omit attachments and unsupported structures. |
| Implemented as text-first fallback | `.doc` | Extract editable body text with an explicit fidelity warning; do not send the binary format to Mammoth. |
| Separate decisions | `.docm`, `.dot`, `.dotx`, `.pages`, `.gdoc`, PDF | Do not include these in the initial promise. Macro-enabled files and templates need explicit security/product rules; Pages is proprietary; a `.gdoc` file is a link rather than the document body; and PDF is fixed-layout rather than a normal editable-document source. |

Microsoft identifies `.docx`, legacy `.doc`, and `.rtf` as distinct Word formats, while `.odt` is the interoperable OpenDocument text format. See [Microsoft's Word format list](https://support.microsoft.com/en-US/Word/file-formats-for-saving-documents) and [its ODT opening guidance](https://support.microsoft.com/en-us/office/use-word-to-open-or-save-a-document-in-the-opendocument-text-odt-format-20e5189f-86f8-4d8f-ae74-ea06b7df3b0e).

## Implementation boundary

Broad-format support needs more than adding extensions to an HTML `accept` attribute:

1. Use one **Import document…** action and one supported-format definition shared by the picker, drag-and-drop detection, API validation, error messages, tests, and observability.
2. Validate both the extension and detected file type. An attacker can rename an executable or unrelated archive to `.doc` or `.rtf`.
3. Keep `.docx` on the current Mammoth path and `.md`/`.txt` on native text paths.
4. The current implementation uses dependency-pinned in-process parsers with signatures, upload limits, a cancellation deadline, and decompression limits. Move complex `.doc`, `.odt`, and `.rtf` parsing into an isolated, resource-limited worker before treating parser hardening as complete.
5. Disable external-resource fetching and macro execution; enforce upload, image, processing-time, and decompression limits; sanitize the converter output with Thido's existing allowlist.
6. Preserve the current replacement confirmation, optimistic-revision check, version-history recovery, authorization, rate limiting, private-image storage, conversion warnings, and privacy-safe logs.
7. If conversion uses an external provider, treat that as a privacy and production-readiness decision: disclose the subprocesser, verify retention/deletion terms, and avoid silently sending private documents to a third party.

## Product conclusion

The menu has evolved into a general document importer for the explicit mainstream set. The UI still names supported formats instead of claiming “any” document, because conversion fidelity and security differ by format. Browser verification with representative real-world files and stronger parser isolation remain production-readiness work.
