"use client";

import { useCallback, useEffect, useState } from "react";
import { fromCommentRow, type ChapterComment, type CommentRow } from "@/lib/comments";

/**
 * Proofreading comments for a book. `onChanged` runs after any change so other
 * collaborators can be told to reload.
 */
export function useComments(documentId: string | undefined, onChanged?: () => void) {
  const [comments, setComments] = useState<ChapterComment[]>([]);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!documentId) return;
    const res = await fetch(`/api/documents/${documentId}/comments`);
    if (!res.ok) return;
    setComments(((await res.json()) as CommentRow[]).map(fromCommentRow));
    setLoaded(true);
  }, [documentId]);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    fetch(`/api/documents/${documentId}/comments`)
      .then((r) => (r.ok ? r.json() : null))
      .then((rows: CommentRow[] | null) => {
        if (cancelled || !rows) return;
        setComments(rows.map(fromCommentRow));
        setLoaded(true);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [documentId]);

  /** Save a comment whose text the editor has already marked with `id`. */
  const create = useCallback(async (input: {
    id: string; chapterId: string; quote: string; body: string; authorName: string;
  }): Promise<ChapterComment | null> => {
    if (!documentId) return null;
    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (!res.ok) return null;
    const comment = fromCommentRow((await res.json()) as CommentRow);
    setComments((prev) => [...prev.filter((c) => c.id !== comment.id), comment]);
    onChanged?.();
    return comment;
  }, [documentId, onChanged]);

  const update = useCallback(async (id: string, patch: { body?: string; resolved?: boolean }): Promise<string | null> => {
    if (!documentId) return "Not ready.";
    const previous = comments;
    setComments((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    const res = await fetch(`/api/documents/${documentId}/comments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setComments(previous);
      return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't save the comment.";
    }
    const saved = fromCommentRow((await res.json()) as CommentRow);
    setComments((prev) => prev.map((c) => (c.id === id ? saved : c)));
    onChanged?.();
    return null;
  }, [documentId, comments, onChanged]);

  const remove = useCallback(async (id: string): Promise<string | null> => {
    if (!documentId) return "Not ready.";
    const res = await fetch(`/api/documents/${documentId}/comments/${id}`, { method: "DELETE" });
    if (!res.ok) {
      return ((await res.json().catch(() => ({}))) as { error?: string }).error ?? "Couldn't delete the comment.";
    }
    setComments((prev) => prev.filter((c) => c.id !== id));
    onChanged?.();
    return null;
  }, [documentId, onChanged]);

  return { comments, loaded, reload, create, update, remove };
}

export type CommentsApi = ReturnType<typeof useComments>;
