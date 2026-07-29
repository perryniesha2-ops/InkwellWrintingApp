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

  const nodepub: Nodepub;
  export default nodepub;
}