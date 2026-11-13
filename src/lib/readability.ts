import { htmlToText } from "@/lib/versionDiff";
import { sentenceRanges } from "@/lib/sentences";

/** One chapter (or any block of editor HTML) to analyze. */
export interface TextSource {
  id: string;
  html: string;
}

export interface SentenceRef {
  sourceId: string;
  text: string;
  words: number;
}

export interface ReadabilityStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  avgWordsPerSentence: number;
  avgWordsPerParagraph: number;
  avgWordLength: number;
  /** Flesch Reading Ease, 0-100 (higher is easier). */
  fleschScore: number;
  /** Flesch-Kincaid grade level. */
  gradeLevel: number;
  readingTime: number;
  /** Share of sentences by length: short <= 10 words, long > 20. */
  sentenceLengthVariety: { short: number; medium: number; long: number };
  longestSentences: SentenceRef[];
  /** Share of sentences with a passive construction. */
  passiveVoicePercent: number;
  passiveExamples: SentenceRef[];
  /** Share of words spoken inside quotation marks. */
  dialoguePercent: number;
  adverbCount: number;
  adverbsPer1000: number;
  topAdverbs: { word: string; count: number }[];
  /** Content words used most often (character names left out). */
  repeatedWords: { word: string; count: number }[];
}

// ── Word-level helpers ─────────────────────────────────

/** Letters/digits, keeping inner apostrophes and hyphens ("don't", "well-known") and decimals ("3.5"). */
const WORD = /[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+|(?<=\p{N})[.,]\p{N}+)*/gu;

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const cleaned = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, "");
  return Math.max(1, cleaned.match(/[aeiouy]{1,2}/g)?.length ?? 1);
}

// "be" + optional adverb/"not" + past participle (regular -ed, or irregular).
const IRREGULAR_PARTICIPLES = [
  "awoken", "beaten", "become", "begun", "bent", "bitten", "blown", "born", "borne", "bought", "bound",
  "broken", "brought", "built", "burnt", "caught", "chosen", "come", "cut", "dealt", "done", "drawn",
  "driven", "drunk", "dug", "eaten", "fallen", "fed", "felt", "fought", "found", "flown", "forbidden",
  "forgiven", "forgotten", "frozen", "given", "gone", "grown", "held", "hidden", "hit", "hung", "hurt",
  "kept", "known", "laid", "led", "left", "lent", "lit", "lost", "made", "meant", "met", "mistaken",
  "paid", "put", "read", "ridden", "risen", "run", "said", "seen", "sent", "set", "sewn", "shaken",
  "shed", "shot", "shown", "shut", "slain", "slung", "sold", "sought", "sown", "spent", "spoken",
  "spun", "spread", "stolen", "struck", "stuck", "stung", "sung", "sunk", "swept", "sworn", "swum",
  "swung", "taken", "taught", "thought", "thrown", "told", "torn", "trodden", "understood", "upset",
  "withdrawn", "woken", "won", "worn", "woven", "wound", "written", "wrung",
];
const PASSIVE = new RegExp(
  `\\b(?:am|is|are|was|were|be|been|being)\\s+(?:(?:not|never|\\w+ly)\\s+)?(?:[a-z]{2,}ed|${IRREGULAR_PARTICIPLES.join("|")})\\b`,
  "gi",
);
// -ed words that are adjectives (often feelings or states), not passive participles.
const NOT_PARTICIPLES = new RegExp(
  `\\b(?:am|is|are|was|were|be|been|being)\\s+(?:(?:not|never|\\w+ly)\\s+)?(?:${[
    "hundred", "naked", "wicked", "sacred", "kindred", "rugged", "ragged", "crooked", "jagged", "wretched",
    "beloved", "aged", "tired", "scared", "excited", "worried", "bored", "interested", "surprised", "confused",
    "frightened", "terrified", "exhausted", "annoyed", "amazed", "embarrassed", "relieved", "shocked",
    "satisfied", "pleased", "delighted", "disappointed", "determined", "convinced", "married", "engaged",
    "dressed", "crowded", "supposed", "used", "related", "ashamed", "armed", "alarmed", "startled", "stunned",
    "puzzled", "concerned", "prepared", "finished", "gone", "\\w+eed",
  ].join("|")})\\b`,
  "i",
);

const NOT_ADVERBS = new Set([
  "family", "early", "only", "likely", "unlikely", "lovely", "friendly", "unfriendly", "lonely", "silly",
  "holy", "ugly", "belly", "bully", "daily", "weekly", "monthly", "yearly", "hourly", "nightly", "rally",
  "tally", "reply", "apply", "supply", "imply", "rely", "comply", "multiply", "ally", "fly", "butterfly",
  "jelly", "folly", "gully", "holly", "lily", "jolly", "sly", "chilly", "hilly", "smelly", "curly",
  "burly", "surly", "elderly", "costly", "deadly", "lively", "ghostly", "heavenly", "cowardly",
  "orderly", "worldly", "scholarly", "sickly", "unruly", "wily", "oily", "homely", "comely", "gnarly",
  "assembly", "anomaly", "monopoly", "melancholy", "july", "italy", "bubbly", "wobbly", "prickly",
  "crinkly", "wrinkly", "freckly", "ply", "doily", "manly", "womanly", "brotherly", "sisterly",
  "motherly", "fatherly", "neighborly", "kingly", "queenly", "princely", "saintly", "beastly", "earthly",
  "unearthly", "leisurely", "shapely", "stately", "timely", "untimely", "measly", "grisly", "grizzly",
]);

const STOPWORDS = new Set((
  "a about above after again against all almost also although always am an and another any are around as at away " +
  "back be because been before being below between both but by can could did do does doing done down during each " +
  "even ever every few for from further get got had has have having he her here hers herself him himself his how " +
  "however i if in into is it its itself just like me might more most much must my myself never no nor not now of " +
  "off on once one only or other our ours ourselves out over own same said say says she should so some still such " +
  "than that the their theirs them themselves then there these they this those though through to too under until " +
  "up upon us very was we were what when where which while who whom whose why will with without would yet you your " +
  "yours yourself yourselves don't didn't wasn't wouldn't couldn't can't won't it's i'm i'd i'll you're he's she's " +
  "they're we're that's there's let's isn't aren't weren't hadn't haven't hasn't doesn't shouldn't i've you'll " +
  "back down off out over into onto toward towards across"
).split(" "));

// ── Paragraph-level helpers ────────────────────────────

/** Paragraph texts of editor HTML. Headings are left out (they aren't prose). */
function paragraphsOf(html: string): string[] {
  const withoutHeadings = (html ?? "").replace(/<h[1-6][^>]*>[\s\S]*?<\/h[1-6]>/gi, "\n\n");
  return htmlToText(withoutHeadings)
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => /[\p{L}\p{N}]/u.test(p));
}

/**
 * Text spoken inside quotation marks: double quotes (straight or curly) and,
 * in paragraphs without any, curly single quotes. An unclosed quote runs to
 * the end of the paragraph (speech that continues into the next one).
 */
function dialogueOf(paragraph: string): string {
  let out = "";
  const useDouble = /["“”]/.test(paragraph);
  let inside = false;
  for (let i = 0; i < paragraph.length; i++) {
    const ch = paragraph[i];
    if (useDouble) {
      if (ch === "“") { inside = true; continue; }
      if (ch === "”") { inside = false; out += " "; continue; }
      if (ch === '"') { inside = !inside; out += " "; continue; }
    } else {
      const prev = paragraph[i - 1] ?? " ";
      const next = paragraph[i + 1] ?? " ";
      if (ch === "‘" && /[\s(—-]/.test(prev)) { inside = true; continue; }
      // A closing quote, not an apostrophe inside a word ("don’t").
      if (ch === "’" && inside && !/\p{L}/u.test(next)) { inside = false; out += " "; continue; }
    }
    if (inside) out += ch;
  }
  return out;
}

// ── Collecting and combining ───────────────────────────

/** Raw counts for one source; combined across sources by `combine`. */
interface Counts {
  words: number;
  letters: number;
  syllables: number;
  sentences: number;
  paragraphs: number;
  short: number;
  medium: number;
  long: number;
  longest: SentenceRef[];
  passiveSentences: number;
  passiveExamples: SentenceRef[];
  dialogueWords: number;
  /** lowercase word -> [uses, uses written in lowercase]; a word that's
   *  mostly capitalized is a name (Kelly, Holly), not an adverb or repetition. */
  adverbs: Map<string, [number, number]>;
  wordUses: Map<string, [number, number]>;
}

const LONG_SENTENCE_WORDS = 30;
const MAX_EXAMPLES = 5;

function collect(source: TextSource): Counts {
  const c: Counts = {
    words: 0, letters: 0, syllables: 0, sentences: 0, paragraphs: 0, short: 0, medium: 0, long: 0,
    longest: [], passiveSentences: 0, passiveExamples: [], dialogueWords: 0,
    adverbs: new Map(), wordUses: new Map(),
  };
  for (const paragraph of paragraphsOf(source.html)) {
    c.paragraphs += 1;
    c.dialogueWords += dialogueOf(paragraph).match(WORD)?.length ?? 0;
    for (const [start, end] of sentenceRanges(paragraph)) {
      const sentence = paragraph.slice(start, end);
      const words = sentence.match(WORD) ?? [];
      if (!words.length) continue;
      c.sentences += 1;
      c.words += words.length;
      if (words.length <= 10) c.short += 1;
      else if (words.length <= 20) c.medium += 1;
      else c.long += 1;
      if (words.length > LONG_SENTENCE_WORDS) c.longest.push({ sourceId: source.id, text: sentence, words: words.length });

      // Judge each "be + participle" phrase on its own, so "was tired" doesn't hide "was told".
      if ([...sentence.matchAll(PASSIVE)].some((m) => !NOT_PARTICIPLES.test(m[0]))) {
        c.passiveSentences += 1;
        if (c.passiveExamples.length < MAX_EXAMPLES) c.passiveExamples.push({ sourceId: source.id, text: sentence, words: words.length });
      }

      for (const word of words) {
        const lower = word.toLowerCase().replace(/’/g, "'");
        c.letters += word.replace(/[^\p{L}\p{N}]/gu, "").length;
        c.syllables += countSyllables(word);
        const isLower = word === word.toLowerCase();
        const tally = (map: Map<string, [number, number]>) => {
          const uses = map.get(lower) ?? [0, 0];
          uses[0] += 1;
          if (isLower) uses[1] += 1;
          map.set(lower, uses);
        };
        if (lower.length > 3 && lower.endsWith("ly") && !NOT_ADVERBS.has(lower)) tally(c.adverbs);
        if (lower.length > 2 && !STOPWORDS.has(lower) && !/^\d/.test(lower)) tally(c.wordUses);
      }
    }
  }
  return c;
}

// Analysis of unchanged chapters is reused while the author types elsewhere.
const cache = new Map<string, Counts>();
function collectCached(source: TextSource): Counts {
  const key = `${source.id}\u0000${source.html}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 300) cache.clear();
  const counts = collect(source);
  cache.set(key, counts);
  return counts;
}

const round1 = (n: number) => Math.round(n * 10) / 10;
const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

function topEntries(map: Map<string, number>, n: number, min = 1) {
  return [...map.entries()]
    .filter(([, count]) => count >= min)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, n)
    .map(([word, count]) => ({ word, count }));
}

function combine(all: Counts[]): ReadabilityStats | null {
  const t = all.reduce((a, c) => {
    a.words += c.words; a.letters += c.letters; a.syllables += c.syllables; a.sentences += c.sentences;
    a.paragraphs += c.paragraphs; a.short += c.short; a.medium += c.medium; a.long += c.long;
    a.passiveSentences += c.passiveSentences; a.dialogueWords += c.dialogueWords;
    return a;
  }, { words: 0, letters: 0, syllables: 0, sentences: 0, paragraphs: 0, short: 0, medium: 0, long: 0, passiveSentences: 0, dialogueWords: 0 });
  if (!t.words) return null;

  const merge = (key: "adverbs" | "wordUses") => {
    const merged = new Map<string, [number, number]>();
    for (const c of all) {
      c[key].forEach(([n, lowerUses], w) => {
        const u = merged.get(w) ?? [0, 0];
        merged.set(w, [u[0] + n, u[1] + lowerUses]);
      });
    }
    // Leave out names and places: words written capitalized most of the time.
    return new Map([...merged].filter(([, [n, lowerUses]]) => lowerUses / n >= 0.5).map(([w, [n]]) => [w, n]));
  };
  const adverbs = merge("adverbs");
  const common = merge("wordUses");
  const adverbCount = [...adverbs.values()].reduce((a, n) => a + n, 0);

  const wordsPerSentence = t.words / t.sentences;
  const syllablesPerWord = t.syllables / t.words;
  return {
    wordCount: t.words,
    sentenceCount: t.sentences,
    paragraphCount: t.paragraphs,
    avgWordsPerSentence: round1(wordsPerSentence),
    avgWordsPerParagraph: round1(t.words / Math.max(1, t.paragraphs)),
    avgWordLength: round1(t.letters / t.words),
    fleschScore: Math.min(100, Math.max(0, Math.round(206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord))),
    gradeLevel: Math.max(0, round1(0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59)),
    readingTime: Math.max(1, Math.round(t.words / 238)),
    sentenceLengthVariety: { short: pct(t.short, t.sentences), medium: pct(t.medium, t.sentences), long: pct(t.long, t.sentences) },
    longestSentences: all.flatMap((c) => c.longest).sort((a, b) => b.words - a.words).slice(0, 3),
    passiveVoicePercent: pct(t.passiveSentences, t.sentences),
    passiveExamples: all.flatMap((c) => c.passiveExamples).slice(0, MAX_EXAMPLES),
    dialoguePercent: Math.min(100, pct(t.dialogueWords, t.words)),
    adverbCount,
    adverbsPer1000: round1((adverbCount / t.words) * 1000),
    topAdverbs: topEntries(adverbs, 6, 2),
    repeatedWords: topEntries(common, 8, 3),
  };
}

/** Readability statistics for one or more chapters (null when there's no prose). */
export function analyzeReadability(sources: TextSource[]): ReadabilityStats | null {
  return combine(sources.map(collectCached));
}
