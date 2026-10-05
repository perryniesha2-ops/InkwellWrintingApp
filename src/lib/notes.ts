/** A note or research item, stored in the Story Bible's bible_notes table. */
export type NoteKind = "note" | "research";

/** An image clipping on a note. `path` is its location in storage. */
export interface NoteAttachment {
  url: string;
  path: string;
  name: string;
  caption: string;
}

export interface Note {
  id: string;
  kind: NoteKind;
  title: string;
  content: string;
  sourceUrl: string;
  chapterId: string | null;
  attachments: NoteAttachment[];
  updatedAt: string | null;
}

export interface NoteRow {
  id: string;
  title: string | null;
  content: string | null;
  kind?: string | null;
  source_url?: string | null;
  chapter_id?: string | null;
  attachments?: NoteAttachment[] | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export type NotePatch = Partial<Pick<Note, "kind" | "title" | "content" | "sourceUrl" | "chapterId" | "attachments">>;

export function fromNoteRow(row: NoteRow): Note {
  return {
    id: String(row.id),
    kind: row.kind === "research" ? "research" : "note",
    title: row.title ?? "",
    content: row.content ?? "",
    sourceUrl: row.source_url ?? "",
    chapterId: row.chapter_id ?? null,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    updatedAt: row.updated_at ?? row.created_at ?? null,
  };
}

export function toNoteRow(patch: NotePatch): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if ("kind" in patch) row.kind = patch.kind;
  if ("title" in patch) row.title = patch.title;
  if ("content" in patch) row.content = patch.content;
  if ("sourceUrl" in patch) row.source_url = patch.sourceUrl || null;
  if ("chapterId" in patch) row.chapter_id = patch.chapterId;
  if ("attachments" in patch) row.attachments = patch.attachments;
  return row;
}

/** Newest first. */
export const byRecent = (a: Note, b: Note) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? "");

/**
 * A source link safe to open: http(s) only (blocks javascript: and data:
 * links), with a missing scheme assumed to be https. Returns null otherwise.
 */
export function safeSourceUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export function sourceHost(raw: string): string {
  const href = safeSourceUrl(raw);
  return href ? new URL(href).hostname.replace(/^www\./, "") : "";
}
