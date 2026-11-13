/**
 * Sentence splitting tuned for fiction: dialogue with its tag counts as one
 * sentence (`"Stop!" he shouted.`), as does a sentence that continues after
 * an ellipsis, and abbreviations, initials and decimals don't end sentences.
 */

const SEGMENT = /[^.!?…]+(?:[.!?…]+["'”’)\]]*|$)/g;
const ENDS_WITH_QUOTE = /[.!?…,]["'”’]\s*$/;
const ENDS_WITH_ELLIPSIS = /(?:…|\.\.\.)\s*$/;
const STARTS_LOWER = /^\s*[a-zà-ÿ]/;
const STARTS_DIGIT = /^\d/;
const ENDS_WITH_DIGIT_DOT = /\d\.$/;
// Titles, common abbreviations, single initials ("J. R.") and "e.g." / "i.e.".
const ABBREVIATION =
  /(?:^|[\s(["'“‘])(?:Mr|Mrs|Ms|Mx|Dr|Prof|St|Mt|Jr|Sr|Capt|Lt|Sgt|Col|Gen|Rev|Fr|Sen|Gov|vs|etc|approx|[A-Za-z]|[a-z]\.[a-z])\.$/;

function shouldJoin(prev: string, next: string): boolean {
  const p = prev.trimEnd();
  if (ABBREVIATION.test(p)) return true;
  if (ENDS_WITH_DIGIT_DOT.test(p) && STARTS_DIGIT.test(next)) return true;
  if ((ENDS_WITH_QUOTE.test(p) || ENDS_WITH_ELLIPSIS.test(p)) && STARTS_LOWER.test(next)) return true;
  return false;
}

/** Untrimmed [start, end) ranges covering the text, one per sentence. */
function rawRanges(text: string): [number, number][] {
  const out: [number, number][] = [];
  for (const m of text.matchAll(SEGMENT)) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    const last = out[out.length - 1];
    if (last && shouldJoin(text.slice(last[0], last[1]), m[0])) last[1] = end;
    else out.push([start, end]);
  }
  return out;
}

const trimRange = (text: string, [start, end]: [number, number]): [number, number] | null => {
  const raw = text.slice(start, end);
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const s = start + (raw.length - raw.trimStart().length);
  return [s, s + trimmed.length];
};

/** Sentences of a paragraph as trimmed [start, end) offsets. */
export function sentenceRanges(text: string): [number, number][] {
  return rawRanges(text).map((r) => trimRange(text, r)).filter((r): r is [number, number] => r !== null);
}

/** The sentence around `offset` in a paragraph's text (trimmed), or null for blank text. */
export function sentenceAt(text: string, offset: number): [number, number] | null {
  const range = rawRanges(text).find(([s, e]) => offset >= s && offset <= e);
  return range ? trimRange(text, range) : null;
}
