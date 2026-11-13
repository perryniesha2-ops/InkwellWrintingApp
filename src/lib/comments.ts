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

export { sentenceAt } from "@/lib/sentences";
