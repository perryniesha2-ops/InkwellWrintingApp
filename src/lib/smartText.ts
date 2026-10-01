import type { StoryElement } from "@/lib/storyElements";

/** A piece of text that refers to a story element. */
export interface SmartTerm {
  text: string;
  elementId: string;
}

export interface TermSuggestion {
  term: SmartTerm;
  /** How many characters before the cursor the accepted term replaces. */
  replaceLength: number;
}

const MIN_FIRST_NAME = 3;
const LETTER = /[\p{L}\p{N}]/u;
const HONORIFICS = /^(mr|mrs|ms|miss|mx|dr|sir|dame|lady|lord|captain|capt|professor|prof|king|queen|prince|princess|aunt|uncle|father|mother|sister|brother)\.?$/i;

/**
 * Terms to recognise: every element's full name, plus a character's first
 * name when it's unambiguous (writers rarely type the full name in prose).
 */
export function buildTerms(elements: StoryElement[]): SmartTerm[] {
  const terms = new Map<string, string | null>();
  for (const el of elements) {
    const name = el.name.trim();
    if (name.length >= 2) terms.set(name, el.id);
  }
  for (const el of elements) {
    if (el.kind !== "character") continue;
    const words = el.name.trim().split(/\s+/);
    // "Mr. Darcy" is referred to as "Darcy", "Elizabeth Bennet" as "Elizabeth".
    const first = HONORIFICS.test(words[0]) ? words[1] : words.length > 1 ? words[0] : undefined;
    if (!first || first.length < MIN_FIRST_NAME || !/^\p{L}[\p{L}'’-]*$/u.test(first)) continue;
    const owner = terms.get(first);
    // Shared first names (or a clash with another element's name) are ambiguous.
    terms.set(first, owner === undefined || owner === el.id ? el.id : null);
  }
  return [...terms]
    .filter((entry): entry is [string, string] => entry[1] !== null)
    .map(([text, elementId]) => ({ text, elementId }));
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Whole-word, case-sensitive matcher; longest terms win ("Anna Lee" over "Anna"). */
export function buildMatcher(terms: SmartTerm[]): RegExp | null {
  if (terms.length === 0) return null;
  const alternatives = [...terms]
    .sort((a, b) => b.text.length - a.text.length)
    .map((t) => escapeRegex(t.text).replace(/\s+/g, "\\s+"))
    .join("|");
  return new RegExp(`(?<![\\p{L}\\p{N}])(?:${alternatives})(?![\\p{L}\\p{N}])`, "gu");
}

export function findTermMatches(
  text: string,
  matcher: RegExp,
  idByText: Map<string, string>,
): { from: number; to: number; elementId: string }[] {
  const out: { from: number; to: number; elementId: string }[] = [];
  matcher.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = matcher.exec(text))) {
    const id = idByText.get(m[0]) ?? idByText.get(m[0].replace(/\s+/g, " "));
    if (id) out.push({ from: m.index, to: m.index + m[0].length, elementId: id });
  }
  return out;
}

/**
 * Suggestions for the word being typed at the end of `textBefore` (the text
 * of the current paragraph up to the cursor). Matching is case-insensitive
 * and works on any word of a name, so "benn" offers "Elizabeth Bennet"; if
 * the earlier words are already typed ("Elizabeth Ben") they're replaced too.
 */
export function suggestTerms(textBefore: string, terms: SmartTerm[], limit = 5): TermSuggestion[] {
  const word = /[\p{L}][\p{L}\p{M}'’-]*$/u.exec(textBefore)?.[0];
  if (!word || word.length < 2) return [];
  const prefix = word.toLowerCase();
  const lead = textBefore.slice(0, -word.length);
  if (lead && LETTER.test(lead.slice(-1))) return [];

  const ranked: (TermSuggestion & { rank: number })[] = [];
  for (const term of terms) {
    const words = term.text.split(/\s+/);
    for (let k = 0; k < words.length; k++) {
      if (!words[k].toLowerCase().startsWith(prefix)) continue;
      const preceding = k > 0 ? `${words.slice(0, k).join(" ")} ` : "";
      const typedPreceding = preceding && lead.toLowerCase().endsWith(preceding.toLowerCase());
      const replaceLength = word.length + (typedPreceding ? preceding.length : 0);
      if (textBefore.slice(-replaceLength) === term.text) break;
      ranked.push({ term, replaceLength, rank: (k === 0 || typedPreceding ? 0 : 1) * 1000 + term.text.length });
      break;
    }
  }
  return ranked
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map(({ term, replaceLength }) => ({ term, replaceLength }));
}
