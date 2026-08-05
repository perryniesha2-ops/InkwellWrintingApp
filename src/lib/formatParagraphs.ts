/**
 * Smart paragraph formatter — inserts breaks at natural boundaries
 * without changing any words or content.
 */

// ── Core splitter ──────────────────────────────────────

export function splitIntoSentenceGroups(text: string): string[] {
  if (!text) return [];

  let result = text
    // Closing quote + optional space + opening quote (?" " or ."")
    // MUST have closing quote before splitting
    .replace(/([.!?,]["'\u201d\u2019])\s*(["'\u201c\u2018])/g, "$1\n\n$2")

    // Closing quote + I — only split if the quote CLOSES here
    // "text." I said → split   (quote is closed by the period+quote)
    // "text. I said" → DON'T split (I is inside the quote)
    .replace(/([.!?]["'\u201d\u2019])\s+(I\s)/g, "$1\n\n$2")

    // Closing quote + capital letter (not inside quotes)
    .replace(/([.!?]["'\u201d\u2019])\s*([A-Z][a-z])/g, "$1\n\n$2")

    // Words running together — only lowercase then capital
    // word.Word → split
    .replace(/([a-z][.!?])([A-Z][a-z])/g, "$1\n\n$2")

    // REMOVED: the rule that split on period + I inside dialogue
    // This was causing "Now, for the job.\nI need" incorrectly

    // Sentence end + new opening quote + capital
    .replace(/([.!?])\s+(["'\u201c\u2018][A-Z])/g, "$1\n\n$2")

    // Closing quote + space + narrative word
    // Only triggers when quote is already closed
    .replace(
      /([.!?]["'\u201d\u2019])\s+(He|She|They|It|We|You|His|Her|The|A|An|My|Our|Your|Their|Then|But|And|So|When|As|After|Before|While|Now|Here|There|This|That)\b/g,
      "$1\n\n$2"
    );

  const parts = result
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  // Rejoin short fragments
  const merged: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (part.length < 5 && merged.length > 0) {
      merged[merged.length - 1] += " " + part;
    } else {
      merged.push(part);
    }
  }

  return merged;
}
// ── Plain text → HTML ──────────────────────────────────

export function fixParagraphs(text: string): string {
  if (!text) return text;

  const groups = splitIntoSentenceGroups(
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim()
  );

  return groups.join("\n\n");
}

export function plainTextToHtml(text: string): string {
  const groups = splitIntoSentenceGroups(
    text
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .trim()
  );

  return groups
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join("");
}

// ── HTML → fixed HTML ──────────────────────────────────

function needsReformatting(text: string): boolean {
  if (/[a-z][.!?][A-Z]/.test(text)) return true;
  if (/[.!?]["'\u201d\u2019]\s*["'\u201c\u2018]/.test(text)) return true;
  if (/[.!?]["'\u201d\u2019]\s*[A-Z]/.test(text)) return true;
  if (/[.!?]["'\u201d\u2019]\s*I[\s'']/.test(text)) return true;
  if (/["'\u201d\u2019][.!?]\s+(He|She|I|They|The|A)\s/.test(text)) return true;
  return false;
}

function fixInlineHtml(innerHTML: string): string {
  if (typeof window === "undefined") return innerHTML;
  const div = document.createElement("div");
  div.innerHTML = innerHTML;
  const text = div.innerText ?? div.textContent ?? "";
  const groups = splitIntoSentenceGroups(text);
  return groups
    .filter((p) => p.trim())
    .map((p) => `<p>${p.trim()}</p>`)
    .join("\n");
}

export function fixHtmlParagraphs(html: string): string {
  if (!html || typeof window === "undefined") return html;

  const div = document.createElement("div");
  div.innerHTML = html;

  const result: string[] = [];

  div.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim() ?? "";
      if (text) result.push(plainTextToHtml(text));
      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    // Preserve headings exactly
    if (["h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) {
      result.push(el.outerHTML);
      return;
    }

    // Preserve blockquotes and hr
    if (tag === "blockquote" || tag === "hr") {
      result.push(el.outerHTML);
      return;
    }

    if (tag === "p") {
      const text = el.innerText ?? el.textContent ?? "";
      const trimmed = text.trim();

      if (!trimmed) {
        result.push("<p>&nbsp;</p>");
        return;
      }

      // Always check for reformatting — not just long paragraphs
      if (needsReformatting(trimmed)) {
        result.push(fixInlineHtml(el.innerHTML));
        return;
      }

      result.push(el.outerHTML);
      return;
    }

    result.push(el.outerHTML);
  });

  return result.join("\n");
}