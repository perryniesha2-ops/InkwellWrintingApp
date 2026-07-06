export interface ReadabilityStats {
  // Counts
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  charCount: number;
  syllableCount: number;

  // Averages
  avgWordsPerSentence: number;
  avgSyllablesPerWord: number;
  avgWordsPerParagraph: number;

  // Scores
  fleschReadingEase: number;
  fleschKincaidGrade: number;
  readingLevel: string;
  readingTime: string;

  // Style
  passiveVoiceCount: number;
  passiveVoicePercent: number;
  dialoguePercent: number;
  adverbCount: number;
  overusedWords: { word: string; count: number }[];

  // Sentence variety
  shortSentences: number; // < 8 words
  mediumSentences: number; // 8-20 words
  longSentences: number; // > 20 words
}

// Count syllables in a word
function countSyllables(word: string): number {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
  word = word.replace(/^y/, "");
  const matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? matches.length : 1;
}

// Check if a sentence is passive voice
function isPassiveVoice(sentence: string): boolean {
  const passivePattern = /\b(am|is|are|was|were|be|been|being)\s+\w+ed\b/i;
  return passivePattern.test(sentence);
}

// Get overused words (excluding common stop words)
const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "but",
  "in",
  "on",
  "at",
  "to",
  "for",
  "of",
  "with",
  "by",
  "from",
  "up",
  "about",
  "into",
  "through",
  "during",
  "is",
  "are",
  "was",
  "were",
  "be",
  "been",
  "being",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "will",
  "would",
  "could",
  "should",
  "may",
  "might",
  "shall",
  "can",
  "need",
  "dare",
  "ought",
  "used",
  "that",
  "this",
  "these",
  "those",
  "i",
  "he",
  "she",
  "it",
  "we",
  "they",
  "you",
  "me",
  "him",
  "her",
  "us",
  "them",
  "my",
  "his",
  "its",
  "our",
  "your",
  "their",
  "what",
  "which",
  "who",
  "whom",
  "not",
  "no",
  "so",
  "if",
  "as",
  "than",
  "then",
  "when",
  "where",
  "how",
  "all",
  "any",
  "both",
  "each",
  "few",
  "more",
  "most",
  "other",
  "some",
  "such",
  "only",
  "own",
  "same",
  "too",
  "very",
  "just",
  "said",
  "also",
  "back",
  "after",
  "before",
  "well",
  "even",
  "still",
  "way",
  "because",
  "come",
  "could",
  "now",
  "like",
  "time",
  "know",
]);

const ADVERBS_PATTERN = /\b\w+ly\b/gi;

export function analyzeReadability(html: string): ReadabilityStats {
  // Strip HTML
  const div = document.createElement("div");
  div.innerHTML = html;
  const plainText = div.innerText ?? div.textContent ?? "";

  if (!plainText.trim()) {
    return emptyStats();
  }

  // Split into paragraphs
  const paragraphs = plainText.split(/\n+/).filter((p) => p.trim().length > 5);

  // Split into sentences
  const sentences = plainText
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  // Split into words
  const words = plainText
    .toLowerCase()
    .replace(/[^a-z\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);

  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const paragraphCount = Math.max(paragraphs.length, 1);
  const charCount = plainText.replace(/\s/g, "").length;

  // Syllables
  const syllableCount = words.reduce(
    (sum, word) => sum + countSyllables(word),
    0,
  );

  // Averages
  const avgWordsPerSentence = wordCount / sentenceCount;
  const avgSyllablesPerWord = syllableCount / Math.max(wordCount, 1);
  const avgWordsPerParagraph = wordCount / paragraphCount;

  // Flesch Reading Ease
  // 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  const fleschReadingEase = Math.max(
    0,
    Math.min(
      100,
      206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord,
    ),
  );

  // Flesch-Kincaid Grade Level
  const fleschKincaidGrade = Math.max(
    0,
    0.39 * avgWordsPerSentence + 11.8 * avgSyllablesPerWord - 15.59,
  );

  // Reading level label
  const readingLevel = getReadingLevel(fleschReadingEase);

  // Reading time (avg 250 words per minute)
  const minutes = wordCount / 250;
  const readingTime =
    minutes < 1
      ? "< 1 min"
      : minutes < 60
        ? `${Math.round(minutes)} min`
        : `${Math.floor(minutes / 60)}h ${Math.round(minutes % 60)}m`;

  // Passive voice
  const passiveSentences = sentences.filter(isPassiveVoice);
  const passiveVoiceCount = passiveSentences.length;
  const passiveVoicePercent = Math.round(
    (passiveVoiceCount / sentenceCount) * 100,
  );

  // Dialogue percentage
  const dialogueMatches = plainText.match(/[""][^""]+[""]/g) ?? [];
  const dialogueWords = dialogueMatches.join(" ").split(/\s+/).length;
  const dialoguePercent = Math.round(
    (dialogueWords / Math.max(wordCount, 1)) * 100,
  );

  // Adverbs
  const adverbMatches = plainText.match(ADVERBS_PATTERN) ?? [];
  const adverbCount = adverbMatches.length;

  // Overused words
  const wordFreq: Record<string, number> = {};
  words.forEach((word) => {
    const clean = word.replace(/[^a-z]/g, "");
    if (clean.length > 3 && !STOP_WORDS.has(clean)) {
      wordFreq[clean] = (wordFreq[clean] ?? 0) + 1;
    }
  });
  const overusedWords = Object.entries(wordFreq)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));

  // Sentence variety
  const shortSentences = sentences.filter(
    (s) => s.split(/\s+/).length < 8,
  ).length;
  const longSentences = sentences.filter(
    (s) => s.split(/\s+/).length > 20,
  ).length;
  const mediumSentences = sentenceCount - shortSentences - longSentences;

  return {
    wordCount,
    sentenceCount,
    paragraphCount,
    charCount,
    syllableCount,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
    avgWordsPerParagraph: Math.round(avgWordsPerParagraph),
    fleschReadingEase: Math.round(fleschReadingEase),
    fleschKincaidGrade: Math.round(fleschKincaidGrade * 10) / 10,
    readingLevel,
    readingTime,
    passiveVoiceCount,
    passiveVoicePercent,
    dialoguePercent,
    adverbCount,
    overusedWords,
    shortSentences,
    mediumSentences,
    longSentences,
  };
}

function getReadingLevel(fleschScore: number): string {
  if (fleschScore >= 90) return "Very Easy";
  if (fleschScore >= 80) return "Easy";
  if (fleschScore >= 70) return "Fairly Easy";
  if (fleschScore >= 60) return "Standard";
  if (fleschScore >= 50) return "Fairly Difficult";
  if (fleschScore >= 30) return "Difficult";
  return "Very Difficult";
}

function emptyStats(): ReadabilityStats {
  return {
    wordCount: 0,
    sentenceCount: 0,
    paragraphCount: 0,
    charCount: 0,
    syllableCount: 0,
    avgWordsPerSentence: 0,
    avgSyllablesPerWord: 0,
    avgWordsPerParagraph: 0,
    fleschReadingEase: 0,
    fleschKincaidGrade: 0,
    readingLevel: "—",
    readingTime: "—",
    passiveVoiceCount: 0,
    passiveVoicePercent: 0,
    dialoguePercent: 0,
    adverbCount: 0,
    overusedWords: [],
    shortSentences: 0,
    mediumSentences: 0,
    longSentences: 0,
  };
}
