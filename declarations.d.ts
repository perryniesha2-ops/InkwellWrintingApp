declare module "nodepub" {
  interface EPubMetadata {
    id: string;
    title: string;
    author: string;
    cover: string;
    genre?: string;
    language?: string;
    showContents?: boolean;
    css?: string;
    description?: string;
    publisher?: string;
  }

  interface EPubDocument {
    addSection(title: string, content: string): void;
    writeEPUB(directory: string, filename: string): Promise<void>;
    getSectionCount(): number;
  }

  interface Nodepub {
    document(metadata: EPubMetadata, coverContent: string): EPubDocument;
  }
  // Add to src/declarations.d.ts:
declare module "html-to-docx" {
  interface DocxOptions {
    table?: { row?: { cantSplit?: boolean } };
    footer?: boolean;
    pageNumber?: boolean;
    font?: string;
    fontSize?: number;
    margins?: {
      top?: number;
      right?: number;
      bottom?: number;
      left?: number;
    };
  }

  function HTMLtoDOCX(
    html: string,
    headerHtml: string | null,
    options?: DocxOptions
  ): Promise<Buffer>;

  export default HTMLtoDOCX;
}

  const nodepub: Nodepub;
  export default nodepub;
}