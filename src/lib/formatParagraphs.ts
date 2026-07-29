/**
 * Smart paragraph formatter — inserts breaks at natural boundaries
 * without changing any words or content.
 */

export function fixParagraphs(text: string): string {
  if (!text) return text;

  // Step 1 — normalize line endings
  let result = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // Step 2 — first join everything into one block
  // so we can re-split properly
  result = result.replace(/\n+/g, " ").trim();

  // Step 3 — split on genuine paragraph boundaries only

  // Dialogue: closing quote followed by narrative (He said / She said etc)
  // "text." She → split BEFORE "She"
  result = result.replace(
    /([.!?]["'\u201c\u201d\u2018\u2019])\s+((?:He|She|I|They|It|We|You|His|Her|The|A|An|My|Your|Our|Their|Then|But|And|So|When|As|If|After|Before|While|Though|Although|Because|Since|Until|Once|Now|Here|There|That|This)\s)/g,
    "$1\n\n$2"
  );

  // Narrative followed by opening dialogue
  // sentence. "dialogue → split BEFORE the quote
  result = result.replace(
    /([.!?])\s+(["'\u201c\u2018][A-Z])/g,
    "$1\n\n$2"
  );

  // Words running together without space after period
  // "still.For" → "still.\n\nFor"
  result = result.replace(
    /([a-z][.!?])([A-Z][a-z])/g,
    "$1\n\n$2"
  );

  // Closing quote immediately followed by capital
  // "word."Next → "word."\n\nNext
  result = result.replace(
    /([.!?]["'\u201d\u2019])([A-Z][a-z])/g,
    "$1\n\n$2"
  );

  // Step 4 — clean up orphaned quotes
  // A lone " or ' on its own line — join it back to previous paragraph
  result = result.replace(/\n\n(["'\u201c\u201d\u2018\u2019])\n\n/g, " $1\n\n");
  result = result.replace(/\n\n(["'\u201c\u201d\u2018\u2019])$/g, " $1");

  // Step 5 — collapse excessive breaks
  result = result.replace(/\n{3,}/g, "\n\n").trim();

  return result;
}

/**
 * Convert plain text paragraphs to Tiptap HTML
 */
export function plainTextToHtml(text: string): string {
  const fixed = fixParagraphs(text);
  return fixed
    .split("\n\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join("");
}

/**
 * Fix paragraphs in existing HTML content
 */
/**
 * Fix paragraphs in existing HTML content
 * Preserves headings, bold, italic and other formatting
 */
export function fixHtmlParagraphs(html: string): string {
  if (!html || typeof window === "undefined") return html;

  const div = document.createElement("div");
  div.innerHTML = html;

  const result: string[] = [];

  // Walk through top-level nodes preserving structure
  div.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      // Raw text node — format and wrap in paragraphs
      const text = node.textContent?.trim() ?? "";
      if (text) {
        const fixed = plainTextToHtml(text);
        result.push(fixed);
      }
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Preserve headings as-is
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      result.push(el.outerHTML);
      return;
    }

    // Preserve blockquotes as-is
    if (tag === "blockquote") {
      result.push(el.outerHTML);
      return;
    }

    // Preserve horizontal rules
    if (tag === "hr") {
      result.push(el.outerHTML);
      return;
    }

    // For paragraphs — check if content needs reformatting
    if (tag === "p") {
      const text = el.innerText ?? el.textContent ?? "";
      const trimmed = text.trim();

      // Skip empty paragraphs
      if (!trimmed) {
        result.push("<p>&nbsp;</p>");
        return;
      }

      // If paragraph is very long and looks like merged content — reformat it
      if (trimmed.length > 400 && needsReformatting(trimmed)) {
        // Preserve inline formatting (bold, italic, etc) by working with innerHTML
        const innerFixed = fixInlineHtml(el.innerHTML);
        result.push(innerFixed);
        return;
      }

      // Otherwise keep as-is
      result.push(el.outerHTML);
      return;
    }

    // Everything else — keep as-is
    result.push(el.outerHTML);
  });

  return result.join("\n");
}

/**
 * Check if a paragraph looks like it has merged sentences that need splitting
 */
function needsReformatting(text: string): boolean {
  // Has periods immediately followed by capitals (merged sentences)
  if (/[a-z][.!?][A-Z]/.test(text)) return true;
  // Has closing quote immediately followed by capital
  if (/[.!?]["'][A-Z]/.test(text)) return true;
  // Has dialogue followed by narrative without break
  if (/["'][.!?]\s+(He|She|I|They|The|A)\s/.test(text)) return true;
  return false;
}

/**
 * Fix paragraph breaks inside HTML while preserving inline tags
 * like <strong>, <em>, <u> etc
 */
function fixInlineHtml(innerHTML: string): string {
  // Extract text, fix it, then wrap each paragraph
  const div = document.createElement("div");
  div.innerHTML = innerHTML;
  const text = div.innerText ?? div.textContent ?? "";
  const fixed = fixParagraphs(text);

  return fixed
    .split("\n\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join("\n");
}