/** Shared (client + server) pieces of the AI proofreader. */

export type ProofCategory = "grammar" | "spelling" | "punctuation" | "spacing" | "missing_word" | "repeated_word";

export const PROOF_CATEGORIES: { key: ProofCategory; label: string; color: string }[] = [
  { key: "grammar", label: "Grammar", color: "#8b5cf6" },
  { key: "spelling", label: "Spelling", color: "#ef4444" },
  { key: "punctuation", label: "Punctuation", color: "#6b7280" },
  { key: "spacing", label: "Spacing", color: "#3b82f6" },
  { key: "missing_word", label: "Missing word", color: "#f97316" },
  { key: "repeated_word", label: "Repeated word", color: "#d97706" },
];

/** A paragraph as sent to the proofreader: its index among the editor's text blocks. */
export interface ProofParagraph {
  n: number;
  text: string;
}

/** What the model returns for one error. */
export interface RawSuggestion {
  paragraph: number;
  original: string;
  replacement: string;
  category: ProofCategory;
  explanation: string;
}

// ── Locating a suggestion in a paragraph ───────────────

/**
 * Lowercase-insensitive match helper: curly quotes -> straight, dashes -> "-",
 * runs of whitespace -> one space. `map[i]` is the original index of
 * normalized character i.
 */
function normalize(text: string): { text: string; map: number[] } {
  let out = "";
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    let ch = text[i];
    if (/\s/.test(ch)) {
      if (out.endsWith(" ")) continue;
      ch = " ";
    } else if (ch === "‘" || ch === "’") ch = "'";
    else if (ch === "“" || ch === "”") ch = '"';
    else if (ch === "–" || ch === "—") ch = "-";
    out += ch;
    map.push(i);
  }
  return { text: out, map };
}

/** [start, end) of `original` in `paragraph`: exact match first, then a forgiving one. */
export function locate(paragraph: string, original: string): [number, number] | null {
  if (!original) return null;
  const exact = paragraph.indexOf(original);
  if (exact >= 0) return [exact, exact + original.length];
  const hay = normalize(paragraph);
  const needle = normalize(original).text;
  if (!needle.trim()) return null;
  const at = hay.text.indexOf(needle);
  if (at < 0) return null;
  return [hay.map[at], hay.map[at + needle.length - 1] + 1];
}

/** Characters that differ only in quote or dash style count as the same. */
const plain = (ch: string) =>
  ch === "\u2018" || ch === "\u2019" ? "'" : ch === "\u201c" || ch === "\u201d" ? '"' : ch === "\u2013" || ch === "\u2014" ? "-" : ch;

/** Common prefix and suffix lengths of two strings (not overlapping). */
function commonEnds(a: string, b: string): [number, number] {
  let p = 0;
  while (p < a.length && p < b.length && plain(a[p]) === plain(b[p])) p++;
  let s = 0;
  while (s < a.length - p && s < b.length - p && plain(a[a.length - 1 - s]) === plain(b[b.length - 1 - s])) s++;
  return [p, s];
}

export interface Edit {
  /** Offsets in the paragraph text of the characters to replace. */
  from: number;
  to: number;
  insert: string;
}

/**
 * The smallest edit to the paragraph that turns `original` into `replacement`,
 * so formatting around the fix (italics, comments) is kept. Null if
 * `original` can't be found or the suggestion changes nothing.
 */
export function editFor(paragraph: string, original: string, replacement: string): Edit | null {
  const range = locate(paragraph, original);
  if (!range) return null;
  const [start, end] = range;
  const actual = paragraph.slice(start, end);
  // Same length (only quote style differed): diff the model's own strings.
  // Otherwise (whitespace was collapsed), diff the paragraph's text directly.
  const base = actual.length === original.length ? original : actual;
  const [p, s] = commonEnds(base, replacement);
  const from = start + p;
  const to = end - s;
  const insert = replacement.slice(p, replacement.length - s);
  if (from === to && !insert) return null;
  if (paragraph.slice(from, to) === insert) return null;
  return { from, to, insert: matchQuoteStyle(paragraph, from, insert) };
}

/**
 * The editor turns quotes curly as you type, but inserted text isn't typed;
 * convert straight quotes in it when the paragraph uses curly ones.
 */
function matchQuoteStyle(paragraph: string, at: number, insert: string): string {
  if (!/[“”‘’]/.test(paragraph) || !/["']/.test(insert)) return insert;
  let out = "";
  for (let i = 0; i < insert.length; i++) {
    const prev = i > 0 ? out[out.length - 1] : paragraph[at - 1] ?? " ";
    const opening = /[\s([{—-]/.test(prev);
    const ch = insert[i];
    out += ch === '"' ? (opening ? "“" : "”") : ch === "'" ? (opening ? "‘" : "’") : ch;
  }
  return out;
}

const CONTEXT = 24;
const squash = (s: string) => s.replace(/\s+/g, " ");

/**
 * Fingerprint of a suggested edit: the change plus the text around it. Used
 * to remember rejected suggestions however the model words or bounds them;
 * it changes (and the suggestion may return) only if that text is edited.
 */
export function editKey(paragraph: string, edit: Edit): string {
  const before = squash(paragraph.slice(Math.max(0, edit.from - CONTEXT), edit.from)).toLowerCase();
  const after = squash(paragraph.slice(edit.to, edit.to + CONTEXT)).toLowerCase();
  return `${before}␟${squash(paragraph.slice(edit.from, edit.to))}␟${squash(edit.insert)}␟${after}`;
}
