import type { Editor } from "@tiptap/react";

/**
 * Normalize text for matching quotes against the editor: case, curly quotes,
 * dashes (en/em dashes and runs of hyphens become one "-"), ellipses and runs
 * of whitespace. `map[i]` is the index in the original string of normalized
 * character i.
 */
function normalize(text: string): { text: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  let lastSpace = false;
  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    if (/\s|\u00a0/.test(ch)) {
      if (lastSpace) continue;
      ch = " ";
      lastSpace = true;
    } else {
      lastSpace = false;
    }
    if (ch === "\u2018" || ch === "\u2019") ch = "'";
    else if (ch === "\u201c" || ch === "\u201d") ch = '"';
    else if (ch === "\u2013" || ch === "\u2014") ch = "-";
    else if (ch === "\u2026") ch = "...";
    if (ch === "-" && out.endsWith("-")) continue;
    for (const c of ch.toLowerCase()) {
      out += c;
      map.push(i);
    }
  }
  return { text: out, map };
}

/** Quotes sometimes come wrapped in quote marks or trailing ellipses. */
const tidy = (quote: string) =>
  normalize(quote.trim()).text.replace(/^["'.\s]+|["'.\s]+$/g, "");

/**
 * Document range of a quoted passage, searched paragraph by paragraph. Falls
 * back to the quote's opening or closing words when the whole quote isn't
 * found (for example after the author edited it).
 */
export function findQuoteRange(editor: Editor, quote: string): { from: number; to: number } | null {
  const needle = tidy(quote);
  if (needle.length < 3) return null;
  const candidates = [needle];
  if (needle.length > 60) candidates.push(needle.slice(0, 60).trimEnd(), needle.slice(-60).trimStart());

  for (const candidate of candidates) {
    let found: { from: number; to: number } | null = null;
    editor.state.doc.descendants((node, pos) => {
      if (found) return false;
      if (!node.isTextblock) return true;
      // One character per inline leaf (hard breaks), so offsets match positions.
      const raw = node.textBetween(0, node.content.size, undefined, "\ufffc");
      const hay = normalize(raw);
      const at = hay.text.indexOf(candidate);
      if (at >= 0) {
        const start = pos + 1 + hay.map[at];
        const end = pos + 1 + hay.map[at + candidate.length - 1] + 1;
        found = { from: start, to: end };
      }
      return false;
    });
    if (found) return found;
  }
  return null;
}

/** Select a quoted passage and scroll it into view. Returns false if not found. */
export function focusQuote(editor: Editor, quote: string): boolean {
  const range = findQuoteRange(editor, quote);
  if (!range) return false;
  editor.chain().focus().setTextSelection(range).scrollIntoView().run();
  const dom = editor.view.domAtPos(range.from).node;
  (dom instanceof HTMLElement ? dom : dom.parentElement)?.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
