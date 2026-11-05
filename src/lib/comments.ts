/** Columns returned by the comments API. */
export const COMMENT_COLUMNS =
  "id, document_id, chapter_id, user_id, author_name, quote, body, resolved, created_at, updated_at";

export interface CommentRow {
  id: string;
  document_id: string;
  chapter_id: string;
  user_id: string;
  author_name: string;
  quote: string;
  body: string;
  resolved: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChapterComment {
  id: string;
  chapterId: string;
  userId: string;
  authorName: string;
  quote: string;
  body: string;
  resolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export const fromCommentRow = (r: CommentRow): ChapterComment => ({
  id: r.id,
  chapterId: r.chapter_id,
  userId: r.user_id,
  authorName: r.author_name,
  quote: r.quote,
  body: r.body,
  resolved: r.resolved,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

const SENTENCE = /[^.!?\u2026]+(?:[.!?\u2026]+["'\u201d\u2019)\]]*|$)/g;
const ENDS_WITH_QUOTE = /[.!?\u2026,]["'\u201d\u2019]\s*$/;
const STARTS_LOWER = /^\s*[a-z\u00e0-\u00ff]/;

/**
 * The sentence around `offset` in a paragraph's text, as [start, end) offsets
 * with surrounding whitespace trimmed. Dialogue and its tag count as one
 * sentence (`"Stop!" he shouted.`). Returns null for blank text.
 */
export function sentenceAt(text: string, offset: number): [number, number] | null {
  const parts = [...text.matchAll(SENTENCE)].map((m) => ({ start: m.index ?? 0, text: m[0] }));
  const i = parts.findIndex((p) => offset >= p.start && offset <= p.start + p.text.length);
  if (i < 0) return null;
  let first = i;
  let last = i;
  while (first > 0 && ENDS_WITH_QUOTE.test(parts[first - 1].text) && STARTS_LOWER.test(parts[first].text)) first -= 1;
  while (last < parts.length - 1 && ENDS_WITH_QUOTE.test(parts[last].text) && STARTS_LOWER.test(parts[last + 1].text)) last += 1;
  const raw = text.slice(parts[first].start, parts[last].start + parts[last].text.length);
  const lead = raw.length - raw.trimStart().length;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const start = parts[first].start + lead;
  return [start, start + trimmed.length];
}
