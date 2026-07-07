export interface ReadabilityStats {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  charCount: number;
  syllableCount: number;
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  avgWordsPerParagraph: number;
  fleschScore: number;
  gradeLevel: number;
  readingTime: number;
  avgSentenceLength: number;
  avgWordLength: number;
  passiveVoicePercent: number;
  dialoguePercent: number;
  adverbCount: number;
  uniqueWordPercent: number;
  sentenceLengthVariety: { short: number; medium: number; long: number };
  shortSentences: number;
  mediumSentences: number;
  longSentences: number;
}

const EMPTY_STATS: ReadabilityStats = {
  wordCount: 0,
  sentenceCount: 0,
  paragraphCount: 0,
  charCount: 0,
  syllableCount: 0,
  avgWordsPerSentence: 0,
  avgSyllablesPerWord: 0,
  avgWordsPerParagraph: 0,
  fleschScore: 0,
  gradeLevel: 0,
  readingTime: 0,
  avgSentenceLength: 0,
  avgWordLength: 0,
  passiveVoicePercent: 0,
  dialoguePercent: 0,
  adverbCount: 0,
  uniqueWordPercent: 0,
  sentenceLengthVariety: { short: 0, medium: 0, long: 0 },
  shortSentences: 0,
  mediumSentences: 0,
  longSentences: 0,
};

function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length <= 3) return 1;
  const cleaned = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");
  const matches = cleaned.match(/[aeiouy]{1,2}/g);
  return Math.max(1, matches?.length ?? 1);
}

const PASSIVE_PATTERNS = [
  /\b(was|were|is|are|been|being|be)\s+\w+ed\b/gi,
  /\b(was|were|is|are|been|being|be)\s+\w+en\b/gi,
];

const ADVERB_PATTERN = /\b\w+ly\b/gi;

export function analyzeReadability(html: string): ReadabilityStats {
  if (typeof window === "undefined") return EMPTY_STATS;
  if (!html || html.trim() === "") return EMPTY_STATS;

  // Strip HTML
  const div = document.createElement("div");
  div.innerHTML = html;
  const plainText = (div.innerText ?? div.textContent ?? "").trim();

  if (!plainText) return EMPTY_STATS;

  // ── Basic counts ────────────────────────────────────────

  const paragraphs = plainText
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  const paragraphCount = Math.max(paragraphs.length, 1);

  const sentences = plainText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const sentenceCount = Math.max(sentences.length, 1);

  const words = plainText.match(/\b\w+\b/g) ?? [];
  const wordCount = words.length;

  if (wordCount === 0) return EMPTY_STATS;

  const charCount = plainText.replace(/\s/g, "").length;

  // ── Syllables ───────────────────────────────────────────

  const syllableCount = words.reduce((sum, w) => sum + countSyllables(w), 0);

  // ── Averages ────────────────────────────────────────────

  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / wordCount;
  const avgWordsPerParagraph = wordCount / paragraphCount;
  const avgSentenceLength = avgWordsPerSentence;
  const avgWordLength = charCount / wordCount;

  // ── Flesch Reading Ease ─────────────────────────────────

  const rawFlesch =
    206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord;
  const fleschScore = Math.min(100, Math.max(0, Math.round(rawFlesch)));

  // ── Flesch-Kincaid Grade Level ──────────────────────────

  const rawGrade =
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59;
  const gradeLevel = Math.max(0, parseFloat(rawGrade.toFixed(1)));

  // ── Reading time (238 wpm average) ─────────────────────

  const readingTime = Math.max(1, Math.round(wordCount / 238));

  // ── Sentence length variety ─────────────────────────────

  let shortSentences = 0;
  let mediumSentences = 0;
  let longSentences = 0;

  sentences.forEach((s) => {
    const len = s.match(/\b\w+\b/g)?.length ?? 0;
    if (len <= 10) shortSentences++;
    else if (len <= 20) mediumSentences++;
    else longSentences++;
  });

  const sentenceLengthVariety = {
    short: Math.round((shortSentences / sentenceCount) * 100),
    medium: Math.round((mediumSentences / sentenceCount) * 100),
    long: Math.round((longSentences / sentenceCount) * 100),
  };

  // ── Passive voice ───────────────────────────────────────

  let passiveCount = 0;
  PASSIVE_PATTERNS.forEach((pattern) => {
    const matches = plainText.match(pattern);
    passiveCount += matches?.length ?? 0;
  });
  const passiveVoicePercent = Math.min(
    100,
    Math.round((passiveCount / sentenceCount) * 100),
  );

  // ── Dialogue ────────────────────────────────────────────

  const dialogueMatches = plainText.match(/"[^"]{2,}"/g) ?? [];
  const dialogueWordCount = dialogueMatches.reduce((sum, d) => {
    return sum + (d.match(/\b\w+\b/g)?.length ?? 0);
  }, 0);
  const dialoguePercent = Math.min(
    100,
    Math.round((dialogueWordCount / wordCount) * 100),
  );

  // ── Adverbs ─────────────────────────────────────────────

  const adverbMatches = plainText.match(ADVERB_PATTERN) ?? [];
  // Filter out common non-adverbs ending in -ly
  const excluded = new Set([
    "family",
    "early",
    "only",
    "likely",
    "lovely",
    "friendly",
    "lonely",
    "silly",
    "holy",
    "ugly",
    "belly",
    "bully",
    "daily",
    "rally",
    "reply",
    "apply",
    "supply",
    "imply",
  ]);
  const adverbCount = adverbMatches.filter(
    (w) => !excluded.has(w.toLowerCase()),
  ).length;

  // ── Unique words ────────────────────────────────────────

  const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
  const uniqueWordPercent = Math.round((uniqueWords.size / wordCount) * 100);

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    charCount,
    syllableCount,
    avgWordsPerSentence: parseFloat(avgWordsPerSentence.toFixed(1)),
    avgSyllablesPerWord: parseFloat(avgSyllablesPerWord.toFixed(2)),
    avgWordsPerParagraph: parseFloat(avgWordsPerParagraph.toFixed(1)),
    fleschScore,
    gradeLevel,
    readingTime,
    avgSentenceLength: parseFloat(avgSentenceLength.toFixed(1)),
    avgWordLength: parseFloat(avgWordLength.toFixed(1)),
    passiveVoicePercent,
    dialoguePercent,
    adverbCount,
    uniqueWordPercent,
    sentenceLengthVariety,
    shortSentences,
    mediumSentences,
    longSentences,
  };
}
