import { decodeEntities } from "@/lib/export/htmlBlocks";

export interface ImportedBook {
  title: string;
  /** Manuscript HTML: chapters as <h1>, subchapters as <h2>, scene breaks as <hr>. */
  html: string;
  warnings: string[];
}

const CHAPTER_WORD = /^(chapter|prologue|epilogue|part|interlude|foreword|afterword|introduction|preface)\b/i;
const BARE_NUMBER = /^(chapter\s+)?(\d{1,3}|[IVXLC]{1,7}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\.?$/i;
const SCENE_BREAK = /^(\*\s*){1,5}$|^#$|^(~\s*){3,}$|^(-\s*){3,}$|^(•\s*){3}$|^⁂$/;
const MAX_HEADING_CHARS = 60;

const textOf = (html: string) => decodeEntities(html.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

/**
 * Clean mammoth's HTML for the editor. Word documents often mark chapters with
 * plain bold paragraphs instead of heading styles, so when there are no <h1>s
 * we promote short "Chapter …"/"Prologue"/"12" paragraphs to chapter headings.
 */
export function normalizeImportedHtml(raw: string, fallbackTitle: string): ImportedBook {
  const warnings: string[] = [];
  let html = raw;

  const images = (html.match(/<img\b[^>]*>/gi) ?? []).length;
  if (images) {
    html = html.replace(/<img\b[^>]*>/gi, "");
    warnings.push(`${images} image${images === 1 ? " was" : "s were"} left out; images aren't supported in chapters yet.`);
  }

  // Title: a paragraph styled "Title" in Word (mapped to h1.book-title).
  let title = "";
  html = html.replace(/<h1 class="book-title">([\s\S]*?)<\/h1>/i, (_, inner: string) => {
    title = textOf(inner);
    return "";
  });
  html = html.replace(/<p class="book-subtitle">[\s\S]*?<\/p>/gi, "");

  // Scene-break paragraphs ("* * *", "#", "~~~") become <hr>.
  html = html.replace(/<p>([\s\S]*?)<\/p>/gi, (m, inner: string) => (SCENE_BREAK.test(textOf(inner)) ? "<hr>" : m));

  if (!/<h1[\s>]/i.test(html)) {
    let promoted = 0;
    html = html.replace(/<p>([\s\S]*?)<\/p>/gi, (m, inner: string) => {
      const text = textOf(inner);
      if (!text || text.length > MAX_HEADING_CHARS) return m;
      if (CHAPTER_WORD.test(text) || BARE_NUMBER.test(text)) {
        promoted++;
        return `<h1>${inner.replace(/<\/?(strong|b|em|i|u)>/gi, "")}</h1>`;
      }
      return m;
    });
    if (!promoted) warnings.push("No chapter headings were found, so the whole document was imported as one chapter.");
  }

  // Drop empty paragraphs Word uses for spacing.
  html = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");

  return { title: title || fallbackTitle, html, warnings };
}

/** Convert a .docx file in the browser. Legacy .doc files are rejected. */
export async function importDocx(file: File): Promise<ImportedBook> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".doc") || file.type === "application/msword") {
    throw new Error("Older .doc files can't be imported. Open the file in Word, Pages or Google Docs, save it as .docx, and try again.");
  }
  if (!name.endsWith(".docx")) {
    throw new Error("Please choose a Word document (.docx).");
  }
  const mammoth = await import("mammoth");
  const result = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    {
      styleMap: [
        "p[style-name='Title'] => h1.book-title:fresh",
        "p[style-name='Subtitle'] => p.book-subtitle:fresh",
      ],
    },
  );
  return normalizeImportedHtml(result.value, file.name.replace(/\.docx$/i, "").trim() || "Untitled");
}
