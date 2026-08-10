import WordExtractor from "word-extractor";

const PARSE_TIMEOUT_MS = 10_000;
const MAX_UNCOMPRESSED_OFFICE_BYTES = 32 * 1024 * 1024;
const MAX_OFFICE_ZIP_ENTRIES = 2_000;

type StructuredOfficeKind = "odt" | "rtf";
type OfficeImportKind = "doc" | "docx" | StructuredOfficeKind;

function hasPrefix(input: Uint8Array, prefix: readonly number[]) {
  return prefix.every((byte, index) => input[index] === byte);
}

export function validateOfficeDocumentSignature(
  input: Uint8Array,
  kind: OfficeImportKind,
) {
  if (kind === "doc") {
    if (hasPrefix(input, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) {
      return;
    }
    throw new Error("The uploaded file is not a legacy Word document.");
  }

  if (kind === "docx" || kind === "odt") {
    if (hasPrefix(input, [0x50, 0x4b])) return;
    throw new Error(
      kind === "docx"
        ? "The uploaded file is not a Word document."
        : "The uploaded file is not an OpenDocument file.",
    );
  }

  const header = new TextDecoder("ascii")
    .decode(input.subarray(0, 32))
    .trimStart();
  if (header.startsWith("{\\rtf")) return;
  throw new Error("The uploaded file is not a Rich Text document.");
}

function boundedWarnings(warnings: unknown) {
  if (!Array.isArray(warnings)) return [];
  return warnings
    .flatMap((warning) => {
      if (typeof warning === "string") return [warning];
      if (
        warning &&
        typeof warning === "object" &&
        "message" in warning &&
        typeof warning.message === "string"
      ) {
        return [warning.message];
      }
      return [];
    })
    .map((warning) => warning.replace(/[\u0000-\u001f]+/g, " ").slice(0, 300))
    .filter(Boolean)
    .slice(0, 6);
}

export async function convertStructuredOfficeDocument(
  input: Uint8Array,
  kind: StructuredOfficeKind,
) {
  validateOfficeDocumentSignature(input, kind);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PARSE_TIMEOUT_MS);

  try {
    const { OfficeParser } = await import("officeparser");
    const parserWarnings: unknown[] = [];
    const ast = await OfficeParser.parseOffice(input, {
      abortSignal: controller.signal,
      decompressionLimits: {
        maxUncompressedBytes: MAX_UNCOMPRESSED_OFFICE_BYTES,
        maxZipEntries: MAX_OFFICE_ZIP_ENTRIES,
      },
      extractAttachments: false,
      fileType: kind,
      ignoreComments: true,
      ignoreHeadersAndFooters: true,
      ignoreNotes: true,
      includeRawContent: false,
      onWarning: (warning) => parserWarnings.push(warning),
    });
    const generated = await ast.to("html", {
      abortSignal: controller.signal,
      includeCharts: false,
      includeImages: false,
      renderMetadata: false,
    });

    return {
      html: String(generated.value),
      warnings: boundedWarnings([
        ...parserWarnings,
        ...ast.warnings,
        ...generated.messages,
      ]),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function extractLegacyWordText(input: Uint8Array) {
  validateOfficeDocumentSignature(input, "doc");
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const extracted = await Promise.race([
      new WordExtractor().extract(Buffer.from(input)),
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("Legacy Word parsing timed out.")),
          PARSE_TIMEOUT_MS,
        );
      }),
    ]);
    return extracted.getBody();
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
