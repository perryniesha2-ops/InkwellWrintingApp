/** Shared (client + server) pieces of the thesaurus. Lookups run on the server: see thesaurus.server.ts. */

export interface ThesaurusResult {
  synonyms: string[];
  /** Narrower words: walk -> stroll, trudge, saunter. */
  specific: string[];
  related: string[];
  /** Broader words: walk -> travel, move. */
  general: string[];
  antonyms: string[];
  /** The base form the word was also looked up as, when it's inflected (walked -> walk). */
  lemma: string | null;
}

/** The longest word or phrase the thesaurus looks up. */
export const MAX_QUERY_LENGTH = 60;

export const isEmpty = (r: ThesaurusResult) =>
  !r.synonyms.length && !r.specific.length && !r.related.length && !r.general.length && !r.antonyms.length;

const cache = new Map<string, ThesaurusResult>();

/**
 * Look a word up through the app's own API, which calls the dictionary
 * service. (Calling it from the browser directly can be blocked by
 * extensions, privacy settings or network filters.)
 */
export async function fetchThesaurus(
  text: string,
  options: { signal?: AbortSignal; fresh?: boolean } = {},
): Promise<ThesaurusResult> {
  const word = text.toLowerCase().trim().replace(/\s+/g, " ");
  const cached = cache.get(word);
  if (cached && !options.fresh) return cached;

  let res: Response;
  try {
    res = await fetch(`/api/thesaurus?${new URLSearchParams({ word })}`, { signal: options.signal });
  } catch (err) {
    if (options.signal?.aborted) throw err;
    throw new Error("Couldn't reach the thesaurus. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as (ThesaurusResult & { error?: string }) | null;
  if (!res.ok || !body || body.error) {
    throw new Error(
      res.status === 401
        ? "Your session has expired. Reload the page and sign in again."
        : (body?.error ?? "The thesaurus isn't responding. Try again in a moment."),
    );
  }
  cache.set(word, body);
  return body;
}

/**
 * The word or phrase to look up for some selected text, and what to add back
 * after a replacement: "night's" is looked up as "night", and "dusk" goes in
 * as "dusk's".
 */
export function splitPossessive(text: string): { query: string; suffix: string } {
  const m = /^(.+?)(['’]s)$/.exec(text);
  return m ? { query: m[1], suffix: m[2] } : { query: text, suffix: "" };
}

/** A replacement in the capitalization of the text it replaces. */
export function matchCase(source: string, word: string): string {
  if (source.length > 1 && /[A-Z]/.test(source) && source === source.toUpperCase()) return word.toUpperCase();
  if (/^[A-Z]/.test(source)) return word.charAt(0).toUpperCase() + word.slice(1);
  return word;
}
