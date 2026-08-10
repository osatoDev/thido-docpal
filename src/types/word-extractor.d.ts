declare module "word-extractor" {
  class ExtractedWordDocument {
    getBody(): string;
  }

  export default class WordExtractor {
    extract(source: Buffer | string): Promise<ExtractedWordDocument>;
  }
}
