import { describe, expect, it } from "vitest";

import {
  convertStructuredOfficeDocument,
  validateOfficeDocumentSignature,
} from "@/lib/legacyDocumentImport";

describe("legacy document import", () => {
  it("rejects files whose bytes do not match their claimed format", () => {
    const disguisedText = new TextEncoder().encode("not an office document");

    expect(() => validateOfficeDocumentSignature(disguisedText, "doc")).toThrow(
      "not a legacy Word document",
    );
    expect(() => validateOfficeDocumentSignature(disguisedText, "docx")).toThrow(
      "not a Word document",
    );
    expect(() => validateOfficeDocumentSignature(disguisedText, "odt")).toThrow(
      "not an OpenDocument file",
    );
    expect(() => validateOfficeDocumentSignature(disguisedText, "rtf")).toThrow(
      "not a Rich Text document",
    );
  });

  it("converts RTF formatting into sanitizable HTML", async () => {
    const rtf = new TextEncoder().encode(
      String.raw`{\rtf1\ansi{\fonttbl{\f0 Arial;}}\f0\fs24 First paragraph\par \b Bold text\b0\par Second paragraph}`,
    );

    const conversion = await convertStructuredOfficeDocument(rtf, "rtf");

    expect(conversion.html).toContain("First paragraph");
    expect(conversion.html).toContain("Bold text");
    expect(conversion.html).toContain("Second paragraph");
  });
});
