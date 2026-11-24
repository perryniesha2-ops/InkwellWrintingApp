"use client";

import { useCallback, useEffect, useState } from "react";
import { convertOutlineDocx, fromOutlineRow, type OutlineDoc, type OutlineDocRow } from "@/lib/outlineDocs";

export interface OutlineUpload {
  outline: OutlineDoc;
  /** Things left out of the file, such as images. */
  warnings: string[];
}

async function send(url: string, method: string, body?: unknown): Promise<OutlineDocRow | null> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  }).catch(() => {
    throw new Error("Couldn't reach the server. Check your connection and try again.");
  });
  const data = (await res.json().catch(() => ({}))) as { outline?: OutlineDocRow; error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
  return data.outline ?? null;
}

/** Add an outline to the list, or update it in place. */
const upsert = (outline: OutlineDoc) => (list: OutlineDoc[]) =>
  list.some((o) => o.id === outline.id) ? list.map((o) => (o.id === outline.id ? outline : o)) : [...list, outline];

/** A book's uploaded outlines (Story Bible), with upload, replace, rename and delete. */
export function useOutlineDocs(documentId: string | undefined) {
  const [outlines, setOutlines] = useState<OutlineDoc[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!documentId) return;
    let cancelled = false;
    fetch(`/api/documents/${documentId}/outlines`)
      .then((r) => (r.ok ? r.json() : { outlines: [] }))
      .then((data: { outlines: OutlineDocRow[] }) => {
        if (cancelled) return;
        setOutlines(data.outlines.map(fromOutlineRow));
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  /** Convert a .docx and add it. Throws an Error with a message to show. */
  const upload = useCallback(
    async (file: File): Promise<OutlineUpload> => {
      if (!documentId) throw new Error("The book hasn't loaded yet.");
      const converted = await convertOutlineDocx(file);
      const row = await send(`/api/documents/${documentId}/outlines`, "POST", {
        title: converted.title,
        fileName: file.name,
        content: converted.html,
        wordCount: converted.wordCount,
      });
      if (!row) throw new Error("The outline couldn't be saved.");
      const outline = fromOutlineRow(row);
      setOutlines(upsert(outline));
      return { outline, warnings: converted.warnings };
    },
    [documentId],
  );

  /** Replace an outline with a new version of the file (keeps its title). */
  const replace = useCallback(
    async (id: string, file: File): Promise<OutlineUpload> => {
      if (!documentId) throw new Error("The book hasn't loaded yet.");
      const converted = await convertOutlineDocx(file);
      const row = await send(`/api/documents/${documentId}/outlines/${id}`, "PATCH", {
        fileName: file.name,
        content: converted.html,
        wordCount: converted.wordCount,
      });
      if (!row) throw new Error("The outline couldn't be saved.");
      const outline = fromOutlineRow(row);
      setOutlines(upsert(outline));
      return { outline, warnings: converted.warnings };
    },
    [documentId],
  );

  const rename = useCallback(
    async (id: string, title: string) => {
      if (!documentId || !title.trim()) return;
      const row = await send(`/api/documents/${documentId}/outlines/${id}`, "PATCH", { title });
      if (row) setOutlines(upsert(fromOutlineRow(row)));
    },
    [documentId],
  );

  const remove = useCallback(
    async (id: string) => {
      if (!documentId) return;
      await send(`/api/documents/${documentId}/outlines/${id}`, "DELETE");
      setOutlines((list) => list.filter((o) => o.id !== id));
    },
    [documentId],
  );

  return { outlines, loaded, upload, replace, rename, remove };
}

export type OutlineDocsApi = ReturnType<typeof useOutlineDocs>;
