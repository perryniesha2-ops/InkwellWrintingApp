"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { prepareImage, ImageRejected } from "@/lib/prepareImage";
import {
  fromNoteRow, toNoteRow,
  type Note, type NoteAttachment, type NoteKind, type NotePatch, type NoteRow,
} from "@/lib/notes";

// Same bucket as story element photos (see useStoryElements).
const BUCKET = "world-images";

const SAVE_DELAY_MS = 600;

/**
 * Notes & research for a book. Rows come from the Story Bible request the
 * Story Elements hook already makes; edits save shortly after typing pauses.
 */
export function useNotes(bibleId: string | null, initialRows: NoteRow[] | null) {
  const { user } = useUser();
  const [notes, setNotes] = useState<Note[]>([]);
  // Kept current synchronously (not after render) so back-to-back image
  // uploads, or an upload right after creating a note, see each other.
  const notesRef = useRef<Note[]>([]);
  const [seededFrom, setSeededFrom] = useState<NoteRow[] | null>(null);
  const pending = useRef(new Map<string, { patch: NotePatch; timer: ReturnType<typeof setTimeout> }>());

  // Take the initial rows once they arrive (adjusting state during render,
  // as React recommends for deriving state from a changed prop).
  if (initialRows && initialRows !== seededFrom) {
    setSeededFrom(initialRows);
    setNotes(initialRows.map(fromNoteRow));
  }
  // Mirror the initial rows into the ref (once, when they arrive).
  useEffect(() => {
    if (initialRows) notesRef.current = initialRows.map(fromNoteRow);
  }, [initialRows]);

  const flush = useCallback((id: string) => {
    const entry = pending.current.get(id);
    pending.current.delete(id);
    if (!entry || !bibleId) return;
    clearTimeout(entry.timer);
    void fetch(`/api/bible/${bibleId}/notes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toNoteRow(entry.patch)),
    });
  }, [bibleId]);

  // Save anything still pending when leaving the page.
  useEffect(() => {
    const map = pending.current;
    return () => { [...map.keys()].forEach(flush); };
  }, [flush]);

  const update = useCallback((id: string, patch: NotePatch) => {
    const apply = (list: Note[]) =>
      list.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: new Date().toISOString() } : n));
    notesRef.current = apply(notesRef.current);
    setNotes(apply);
    const existing = pending.current.get(id);
    if (existing) clearTimeout(existing.timer);
    pending.current.set(id, {
      patch: { ...existing?.patch, ...patch },
      timer: setTimeout(() => flush(id), SAVE_DELAY_MS),
    });
  }, [flush]);

  const create = useCallback(async (init: { kind: NoteKind; title?: string; content?: string; chapterId?: string | null }): Promise<Note | null> => {
    if (!bibleId) return null;
    const res = await fetch(`/api/bible/${bibleId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: init.kind,
        title: init.title ?? (init.kind === "research" ? "New research" : "New note"),
        content: init.content ?? "",
        chapterId: init.chapterId ?? null,
      }),
    });
    if (!res.ok) return null;
    const note = fromNoteRow((await res.json()) as NoteRow);
    notesRef.current = [note, ...notesRef.current];
    setNotes((prev) => [note, ...prev]);
    return note;
  }, [bibleId]);

  const remove = useCallback(async (id: string) => {
    if (!bibleId) return;
    const entry = pending.current.get(id);
    if (entry) clearTimeout(entry.timer);
    pending.current.delete(id);
    const res = await fetch(`/api/bible/${bibleId}/notes/${id}`, { method: "DELETE" });
    if (res.ok) {
      notesRef.current = notesRef.current.filter((n) => n.id !== id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    }
  }, [bibleId]);

  /**
   * Upload images to a note. Resolves to an error message for any that
   * couldn't be added (others still upload), or null if all succeeded.
   */
  const addImages = useCallback(async (id: string, files: File[]): Promise<string | null> => {
    if (!user) return "Sign in to upload images.";
    const supabase = createClient();
    const added: NoteAttachment[] = [];
    const problems: string[] = [];
    for (const original of files) {
      try {
        const file = await prepareImage(original);
        const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const path = `${user.id}/notes/${id}/${crypto.randomUUID()}.${ext}`;
        const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (error) throw new Error(error.message);
        added.push({
          url: supabase.storage.from(BUCKET).getPublicUrl(data.path).data.publicUrl,
          path: data.path,
          name: original.name || "Screenshot",
          caption: "",
        });
      } catch (err) {
        problems.push(err instanceof ImageRejected ? err.message : `${original.name || "An image"} couldn't be uploaded.`);
      }
    }
    const note = notesRef.current.find((n) => n.id === id);
    if (note && added.length) update(id, { attachments: [...note.attachments, ...added] });
    return problems.length ? problems.join(" ") : null;
  }, [user, update]);

  const removeImage = useCallback((id: string, path: string) => {
    const note = notesRef.current.find((n) => n.id === id);
    if (!note) return;
    update(id, { attachments: note.attachments.filter((a) => a.path !== path) });
    // Best-effort cleanup; storage only lets people delete their own uploads.
    if (user && path.startsWith(`${user.id}/`)) void createClient().storage.from(BUCKET).remove([path]);
  }, [user, update]);

  const setCaption = useCallback((id: string, path: string, caption: string) => {
    const note = notesRef.current.find((n) => n.id === id);
    if (!note) return;
    update(id, { attachments: note.attachments.map((a) => (a.path === path ? { ...a, caption } : a)) });
  }, [update]);

  return { notes, ready: !!bibleId, create, update, remove, addImages, removeImage, setCaption };
}

export type NotesApi = ReturnType<typeof useNotes>;
