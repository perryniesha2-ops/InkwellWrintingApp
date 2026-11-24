/** Thesaurus lookups through the free Datamuse API (https://www.datamuse.com/api/), run on the server. */

import { inflect, isIrregular, lemmaCandidates, type Lemma } from "@/lib/inflect";
import type { ThesaurusResult } from "@/lib/thesaurus";

interface DatamuseWord {
  word: string;
  tags?: string[];
}

const API = "https://api.datamuse.com/words";

export class ThesaurusError extends Error {}

/** One Datamuse request, retried once if it fails or takes too long. */
async function datamuse(params: Record<string, string | number>, signal?: AbortSignal): Promise<DatamuseWord[]> {
  const query = new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]));
  let failure: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const timeout = AbortSignal.timeout(6000);
      const res = await fetch(`${API}?${query}`, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout });
      if (res.ok) return (await res.json()) as DatamuseWord[];
      failure = new Error(`Datamuse returned ${res.status}`);
      if (res.status < 500 && res.status !== 429) break;
    } catch (err) {
      if (signal?.aborted) throw err;
      failure = err;
    }
  }
  console.error("Datamuse request failed:", failure);
  throw new ThesaurusError("The thesaurus service didn't respond.");
}

const tagsOf = (w: DatamuseWord) => w.tags ?? [];
const frequency = (w: DatamuseWord) => Number(tagsOf(w).find((t) => t.startsWith("f:"))?.slice(2) ?? 0);

/**
 * Of the guesses at a word's base form (walked -> walk, walke), the one the
 * dictionary knows as a verb (or a noun, for -s forms) and uses most.
 */
async function pickLemma(guesses: Lemma[], signal?: AbortSignal): Promise<Lemma | null> {
  const checks = await Promise.all(
    // An unknown spelling comes back corrected, so only an exact match counts.
    guesses.map((g) => datamuse({ sp: g.base, md: "fp", max: 1 }, signal).then((r) => (r[0]?.word === g.base ? r[0] : null))),
  );
  let best: Lemma | null = null;
  let bestFrequency = 0;
  guesses.forEach((guess, i) => {
    const hit = checks[i];
    if (!hit) return;
    const tags = tagsOf(hit);
    const fits = tags.includes("v") || (guess.form === "s" && tags.includes("n"));
    if (fits && frequency(hit) > bestFrequency) {
      best = guess;
      bestFrequency = frequency(hit);
    }
  });
  return best;
}

/** Results for the base form, put into the word's own form (walk's "stroll" -> "strolled"). */
function reinflect(words: DatamuseWord[], lemma: Lemma): string[] {
  const ownForms = new RegExp(`^${lemma.base}(s|es|d|ed|ing)?\\b`);
  return words.flatMap((w) => {
    const tags = tagsOf(w);
    const verb = tags.includes("v");
    if (!verb && !(lemma.form === "s" && tags.includes("n"))) return [];
    if (ownForms.test(w.word)) return [];
    return [inflect(w.word, lemma.form, verb)];
  });
}

/** Filler that Datamuse's loose "means like" search returns for common words ("said" -> "were", "this"). */
const FILLER = new Set(
  `a an and are as at be been but by did do does for from had has have he her his i if in is it its me my
  no not of on or our same she so than that the their them then there these they this those to us was we
  were what when which who will with would you your`.split(/\s+/),
);

const cache = new Map<string, ThesaurusResult>();

/** Synonyms and related words for a word or short phrase. */
export async function lookupWord(text: string, options: { signal?: AbortSignal; fresh?: boolean } = {}): Promise<ThesaurusResult> {
  const word = text.toLowerCase().trim().replace(/\s+/g, " ");
  const cached = cache.get(word);
  if (cached && !options.fresh) return cached;
  const { signal } = options;

  // Datamuse's "rel_gen" means "the query is more general than", so it gives
  // narrower words; "rel_spc" ("the query is a kind of") gives broader ones.
  const RELATIONS = [
    ["rel_syn", 20],
    ["rel_gen", 40],
    ["rel_spc", 10],
    ["rel_ant", 10],
  ] as const;
  const direct = Promise.all([
    ...RELATIONS.map(([rel, max]) => datamuse({ [rel]: word, max }, signal)),
    datamuse({ ml: word, max: 20 }, signal),
  ]);

  // Inflected words get few or no results ("walked"), so also look up the
  // base form and inflect what comes back.
  const guesses = word.includes(" ") ? [] : lemmaCandidates(word);
  const irregular = isIrregular(word);
  const lemma = irregular ? (guesses[0] ?? null) : guesses.length ? await pickLemma(guesses, signal) : null;
  const fromLemma = lemma
    ? (await Promise.all(RELATIONS.map(([rel, max]) => datamuse({ [rel]: lemma.base, md: "p", max }, signal)))).map((list) =>
        reinflect(list, lemma),
      )
    : RELATIONS.map(() => [] as string[]);

  const [syn, specific, general, antonyms, related] = (await direct).map((list) => list.map((w) => w.word));
  // Irregular forms ("said", "rose", "left") are nearly always verbs in prose,
  // while their own results are other senses ("aforesaid", the flower), so
  // the base form's results go first. A regular form only has results of its
  // own when it's a word in its own right ("tired"), so those go first.
  const merge = (own: string[], viaLemma: string[]) => (irregular ? [...viaLemma, ...own] : [...own, ...viaLemma]);

  const seen = new Set([word, lemma?.base].filter(Boolean));
  const take = (words: string[], limit: number) => {
    const out: string[] = [];
    for (const w of words) {
      const key = w.toLowerCase();
      if (seen.has(key) || out.length >= limit) continue;
      seen.add(key);
      out.push(w);
    }
    return out;
  };
  const result: ThesaurusResult = {
    synonyms: take(merge(syn, fromLemma[0]), 24),
    specific: take(merge(specific, fromLemma[1]), 30),
    // Loose associations; multi-word ones ("walk of life") are rarely a fit for one word.
    related: take(
      related.filter((w) => !FILLER.has(w) && (word.includes(" ") || !w.includes(" "))),
      12,
    ),
    general: take(merge(general, fromLemma[2]), 10),
    antonyms: take(merge(antonyms, fromLemma[3]), 10),
    lemma: lemma?.base ?? null,
  };

  if (cache.size >= 1000) cache.delete(cache.keys().next().value!);
  cache.set(word, result);
  return result;
}
