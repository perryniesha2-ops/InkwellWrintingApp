"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import type { NoteRow } from "@/lib/notes";
import {
  fromCharacter, fromWorldEntry, toRow,
  type CharacterRow, type ElementPatch, type NewElementType,
  type StoryElement, type WorldEntryRow,
} from "@/lib/storyElements";

const SAVE_DELAY_MS = 600;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const endpoint = (bibleId: string, el: Pick<StoryElement, "id" | "kind">) =>
  `/api/bible/${bibleId}/${el.kind === "character" ? "characters" : "world"}/${el.id}`;

export function useStoryElements(documentId: string | undefined) {
  const { user } = useUser();
  const [elements, setElements] = useState<StoryElement[]>([]);
  const [bibleId, setBibleId] = useState<string | null>(null);
  // Loaded here too (same request) so the Notes hook doesn't fetch — and
  // possibly create — the Story Bible a second time.
  const [noteRows, setNoteRows] = useState<NoteRow[] | null>(null);
  const elementsRef = useRef(elements);
  // Per-element pending field changes, flushed after typing pauses.
  const pending = useRef(new Map<string, { patch: ElementPatch; timer: ReturnType<typeof setTimeout> }>());

  useEffect(() => {
    elementsRef.current = elements;
  }, [elements]);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    fetch(`/api/bible/${documentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: { bible: { id: string }; characters: CharacterRow[]; world: WorldEntryRow[]; notes: NoteRow[] } | null) => {
        if (cancelled || !data) return;
        setBibleId(data.bible.id);
        setNoteRows(data.notes ?? []);
        setElements([...data.characters.map(fromCharacter), ...data.world.map(fromWorldEntry)]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [documentId]);

  const flush = useCallback((id: string) => {
    const entry = pending.current.get(id);
    const el = elementsRef.current.find((e) => e.id === id);
    pending.current.delete(id);
    if (!entry || !el || !bibleId) return;
    clearTimeout(entry.timer);
    void fetch(endpoint(bibleId, el), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toRow(el.kind, entry.patch)),
    });
  }, [bibleId]);

  // Save anything still pending when leaving the page.
  useEffect(() => {
    const map = pending.current;
    return () => { [...map.keys()].forEach(flush); };
  }, [flush]);

  const update = useCallback((id: string, patch: ElementPatch) => {
    setElements((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    const existing = pending.current.get(id);
    if (existing) clearTimeout(existing.timer);
    pending.current.set(id, {
      patch: { ...existing?.patch, ...patch },
      timer: setTimeout(() => flush(id), SAVE_DELAY_MS),
    });
  }, [flush]);

  const create = useCallback(async (type: NewElementType): Promise<StoryElement | null> => {
    if (!bibleId) return null;
    const isCharacter = type.kind === "character";
    const res = await fetch(`/api/bible/${bibleId}/${isCharacter ? "characters" : "world"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        isCharacter ? { name: "New Character" } : { title: `New ${type.label}`, category: type.category },
      ),
    });
    if (!res.ok) return null;
    const row = await res.json();
    const el = isCharacter ? fromCharacter(row as CharacterRow) : fromWorldEntry(row as WorldEntryRow);
    setElements((prev) => [el, ...prev]);
    return el;
  }, [bibleId]);

  const remove = useCallback(async (id: string) => {
    const el = elementsRef.current.find((e) => e.id === id);
    if (!el || !bibleId) return;
    const entry = pending.current.get(id);
    if (entry) clearTimeout(entry.timer);
    pending.current.delete(id);
    const res = await fetch(endpoint(bibleId, el), { method: "DELETE" });
    if (res.ok) setElements((prev) => prev.filter((e) => e.id !== id));
  }, [bibleId]);

  /** Uploads images to storage and appends them to the element's photos. */
  const uploadPhotos = useCallback(async (id: string, files: FileList): Promise<string | null> => {
    if (!user) return null;
    const supabase = createClient();
    const urls: string[] = [];
    let error: string | null = null;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { error = `${file.name} isn't an image.`; continue; }
      if (file.size > MAX_PHOTO_BYTES) { error = `${file.name} is larger than 5MB.`; continue; }
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${id}/${crypto.randomUUID()}.${ext}`;
      const { data, error: uploadError } = await supabase.storage
        .from("world-images")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (uploadError) { error = uploadError.message; continue; }
      urls.push(supabase.storage.from("world-images").getPublicUrl(data.path).data.publicUrl);
    }
    const el = elementsRef.current.find((e) => e.id === id);
    if (el && urls.length) update(id, { photos: [...el.photos, ...urls] });
    return error;
  }, [user, update]);

  return { elements, bibleId, noteRows, create, update, remove, uploadPhotos };
}

export type StoryElementsApi = ReturnType<typeof useStoryElements>;
