import { diffWords } from "diff";
import { buildChapterTree, flattenChapterTree, type Chapter } from "@/lib/chapters";

/** A chapter as stored in a revision snapshot (or loaded from the chapters API). */
export type VersionChapter = Pick<Chapter, "id" | "parent_id" | "title" | "content" | "order_index">;

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
}

export interface ChapterDiff {
  id: string;
  title: string;
  /** Set when the chapter was renamed between the two versions. */
  oldTitle?: string;
  isSubchapter: boolean;
  status: "added" | "removed" | "changed" | "unchanged";
  parts: DiffPart[];
  wordsAdded: number;
  wordsRemoved: number;
}

const BLOCK_END = /<\/(p|h[1-6]|li|blockquote|pre|div)>|<br\s*\/?>|<hr\s*\/?>/gi;

/** Chapter HTML as plain text, one paragraph per line pair. */
export function htmlToText(html: string): string {
  return (html ?? "")
    .replace(BLOCK_END, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

const inReadingOrder = (chapters: VersionChapter[]) =>
  flattenChapterTree(buildChapterTree(chapters as Chapter[]));

/**
 * Word-level diff of two versions of a book, chapter by chapter. Chapters are
 * matched by id (restores keep ids), listed in the newer version's reading
 * order, with chapters that only exist in the older version placed after the
 * chapter that preceded them there.
 */
export function diffVersions(older: VersionChapter[], newer: VersionChapter[]): ChapterDiff[] {
  const olderOrdered = inReadingOrder(older);
  const newerOrdered = inReadingOrder(newer);
  const olderById = new Map(olderOrdered.map((c) => [c.id, c]));
  const newerIds = new Set(newerOrdered.map((c) => c.id));

  const diffs: ChapterDiff[] = newerOrdered.map((c) => {
    const prev = olderById.get(c.id);
    const newText = htmlToText(c.content);
    if (!prev) {
      return {
        id: c.id, title: c.title, isSubchapter: !!c.parent_id, status: "added",
        parts: newText ? [{ value: newText, added: true }] : [],
        wordsAdded: wordCount(newText), wordsRemoved: 0,
      };
    }
    const parts: DiffPart[] = diffWords(htmlToText(prev.content), newText);
    let wordsAdded = 0;
    let wordsRemoved = 0;
    for (const p of parts) {
      if (p.added) wordsAdded += wordCount(p.value);
      else if (p.removed) wordsRemoved += wordCount(p.value);
    }
    const renamed = prev.title !== c.title;
    return {
      id: c.id,
      title: c.title,
      oldTitle: renamed ? prev.title : undefined,
      isSubchapter: !!c.parent_id,
      status: wordsAdded || wordsRemoved || renamed ? "changed" : "unchanged",
      parts,
      wordsAdded,
      wordsRemoved,
    };
  });

  // Slot removed chapters in after their nearest surviving predecessor.
  let anchor: string | null = null;
  for (const c of olderOrdered) {
    if (newerIds.has(c.id)) { anchor = c.id; continue; }
    const oldText = htmlToText(c.content);
    const removed: ChapterDiff = {
      id: c.id, title: c.title, isSubchapter: !!c.parent_id, status: "removed",
      parts: oldText ? [{ value: oldText, removed: true }] : [],
      wordsAdded: 0, wordsRemoved: wordCount(oldText),
    };
    const at = anchor ? diffs.findIndex((d) => d.id === anchor) + 1 : 0;
    diffs.splice(at, 0, removed);
    anchor = c.id;
  }

  return diffs;
}

/**
 * Shorten long unchanged stretches so the edits stand out: keep some context
 * around each change and replace the middle with an ellipsis marker.
 */
export function collapseUnchanged(parts: DiffPart[], context = 220): (DiffPart & { collapsed?: boolean })[] {
  return parts.flatMap((p, i) => {
    if (p.added || p.removed || p.value.length <= context * 2.5) return [p];
    const isFirst = i === 0;
    const isLast = i === parts.length - 1;
    const head = isFirst ? "" : cutAtWord(p.value.slice(0, context), "end");
    const tail = isLast ? "" : cutAtWord(p.value.slice(-context), "start");
    return [
      ...(head ? [{ value: head }] : []),
      { value: " ⋯ ", collapsed: true },
      ...(tail ? [{ value: tail }] : []),
    ];
  });
}

function cutAtWord(s: string, side: "start" | "end"): string {
  if (side === "end") {
    const i = s.lastIndexOf(" ");
    return i > 0 ? s.slice(0, i) : s;
  }
  const i = s.indexOf(" ");
  return i >= 0 ? s.slice(i + 1) : s;
}
