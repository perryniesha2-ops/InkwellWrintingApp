/** Outlines uploaded to the Story Bible as Word documents (shared client + server pieces). */

import { decodeEntities } from "@/lib/export/htmlBlocks";

export interface OutlineDoc {
  id: string;
  title: string;
  fileName: string | null;
  /** The outline as HTML. Always pass it through sanitizeOutlineHtml before showing it. */
  content: string;
  wordCount: number;
  updatedAt: string | null;
}

export interface OutlineDocRow {
  id: string;
  title: string | null;
  file_name: string | null;
  content: string | null;
  word_count: number | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export const fromOutlineRow = (row: OutlineDocRow): OutlineDoc => ({
  id: String(row.id),
  title: row.title || "Outline",
  fileName: row.file_name ?? null,
  content: row.content ?? "",
  wordCount: row.word_count ?? 0,
  updatedAt: row.updated_at ?? row.created_at ?? null,
});

export const MAX_OUTLINE_FILE_BYTES = 15 * 1024 * 1024;
/** About 250,000 words of formatted text: far more than any outline. */
export const MAX_OUTLINE_HTML_CHARS = 2_000_000;
export const MAX_OUTLINE_TITLE_CHARS = 200;

/** Plain text of outline HTML, one line per block (for word counts and the plot checker). */
export function outlineText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(br|hr)\b[^>]*>/gi, "\n")
      .replace(/<\/(p|h[1-6]|li|tr|blockquote|table)>/gi, "\n")
      .replace(/<\/t[dh]>/gi, "\t")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export const countWords = (text: string) => (text.match(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu) ?? []).length;

export interface ConvertedOutline {
  title: string;
  html: string;
  wordCount: number;
  warnings: string[];
}

/**
 * A Word document as HTML, without images. A paragraph in Word's "Title"
 * style is taken out and returned as `title`. Browser only; throws an Error
 * with a message to show.
 */
export async function readDocxHtml(file: File): Promise<{ html: string; title: string; images: number }> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".doc") || file.type === "application/msword") {
    throw new Error("Older .doc files can't be uploaded. Open the file in Word, Pages or Google Docs, save it as .docx, and try again.");
  }
  if (!name.endsWith(".docx")) throw new Error("Please choose a Word document (.docx).");
  if (file.size > MAX_OUTLINE_FILE_BYTES) throw new Error("That file is too large (the limit is 15 MB).");

  const mammoth = await import("mammoth");
  let images = 0;
  const result = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    {
      styleMap: ["p[style-name='Title'] => h1.doc-title:fresh"],
      // Images aren't kept (yet); don't spend time encoding them.
      convertImage: mammoth.images.imgElement(async () => {
        images++;
        return { src: "" };
      }),
    },
  );

  let html = result.value.replace(/<img\b[^>]*>/gi, "");
  let title = "";
  html = html.replace(/<h1 class="doc-title">([\s\S]*?)<\/h1>/i, (_, inner: string) => {
    title = outlineText(inner);
    return "";
  });
  // Empty paragraphs Word uses for spacing.
  html = html.replace(/<p>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
  if (!outlineText(html)) throw new Error("That document looks empty.");
  return { html, title, images };
}

/** Convert a .docx outline in the browser, keeping its headings, lists and tables. */
export async function convertOutlineDocx(file: File): Promise<ConvertedOutline> {
  const { html, title, images } = await readDocxHtml(file);
  if (html.length > MAX_OUTLINE_HTML_CHARS) throw new Error("That outline is too long to upload.");
  const text = outlineText(html);

  const warnings: string[] = [];
  if (images) warnings.push(`${images} image${images === 1 ? " was" : "s were"} left out; images in outlines aren't supported yet.`);
  return {
    title: (title || file.name.replace(/\.docx$/i, "").trim() || "Outline").slice(0, MAX_OUTLINE_TITLE_CHARS),
    html,
    wordCount: countWords(text),
    warnings,
  };
}

// ── Showing an outline safely ──────────────────────────
// Outlines are shared with collaborators, and the stored HTML could have come
// from anyone with edit access, so it's rebuilt from an allowlist before it
// goes on the page: only these tags, and only safe attributes.

const KEEP = new Set([
  "p", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "strong", "b", "em", "i", "u", "s",
  "sub", "sup", "br", "hr", "blockquote", "table", "thead", "tbody", "tfoot", "tr", "td", "th", "a",
]);
/** Removed with everything inside them. Any other tag is unwrapped (its text kept). */
const DROP = new Set([
  "script", "style", "iframe", "frame", "object", "embed", "svg", "math", "template", "noscript",
  "img", "picture", "video", "audio", "source", "canvas", "form", "input", "button", "select",
  "textarea", "link", "meta", "base", "head", "title",
]);

function safeHref(href: string | null): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, "https://invalid.example/");
    if (url.origin === "https://invalid.example") return null; // relative or #fragment
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? url.href : null;
  } catch {
    return null;
  }
}

/** Safe HTML for an outline. Browser only (empty on the server). */
export function sanitizeOutlineHtml(html: string): string {
  if (typeof DOMParser === "undefined") return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const out = parsed.createElement("div");

  const copy = (from: Node, into: Element) => {
    for (const child of Array.from(from.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        into.append(parsed.createTextNode(child.textContent ?? ""));
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as Element;
      const tag = el.tagName.toLowerCase();
      if (DROP.has(tag)) continue;
      if (!KEEP.has(tag)) {
        copy(el, into);
        continue;
      }
      if (tag === "a") {
        const href = safeHref(el.getAttribute("href"));
        if (!href) {
          copy(el, into);
          continue;
        }
        const a = parsed.createElement("a");
        a.setAttribute("href", href);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
        copy(el, a);
        into.append(a);
        continue;
      }
      const clean = parsed.createElement(tag);
      if (tag === "td" || tag === "th") {
        for (const attr of ["colspan", "rowspan"]) {
          const n = Number(el.getAttribute(attr));
          if (Number.isInteger(n) && n > 1 && n <= 100) clean.setAttribute(attr, String(n));
        }
      }
      copy(el, clean);
      into.append(clean);
    }
  };
  copy(parsed.body, out);
  return out.innerHTML;
}

export interface OutlineHeading {
  /** Position among the outline's h1–h4 elements, in document order. */
  index: number;
  level: number;
  text: string;
}

/** The outline's headings (h1–h4), for jumping around it. Browser only. */
export function outlineHeadings(safeHtml: string): OutlineHeading[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(safeHtml, "text/html");
  return Array.from(doc.body.querySelectorAll("h1, h2, h3, h4")).map((h, index) => ({
    index,
    level: Number(h.tagName[1]),
    text: (h.textContent ?? "").replace(/\s+/g, " ").trim(),
  }));
}

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];
const normalize = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** The chapter number in "Chapter 3", "Ch. 12: The Storm" or "Chapter Three". */
function chapterNumber(text: string): number | null {
  const m = /\b(?:chapter|ch)\s+(\d{1,3}|[a-z]+)\b/.exec(normalize(text));
  if (!m) return null;
  if (/^\d+$/.test(m[1])) return Number(m[1]);
  const n = NUMBER_WORDS.indexOf(m[1]);
  return n > 0 ? n : null;
}

/**
 * The heading for a chapter of the manuscript: one with the same chapter
 * number, or one that contains the chapter's title ("The Storm" matches
 * "Chapter 4 – The Storm").
 */
export function headingForChapter(headings: OutlineHeading[], chapterTitle: string): OutlineHeading | null {
  const number = chapterNumber(chapterTitle);
  if (number !== null) {
    const hit = headings.find((h) => chapterNumber(h.text) === number);
    if (hit) return hit;
  }
  const title = normalize(chapterTitle).replace(/^(chapter|ch)\s+\S+\s*/, "");
  if (title.length < 4) return null;
  return headings.find((h) => ` ${normalize(h.text)} `.includes(` ${title} `)) ?? null;
}
