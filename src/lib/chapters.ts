export interface Chapter {
  id: string;
  document_id: string;
  parent_id: string | null;
  title: string;
  content: string;
  synopsis: string;
  /** How-to-write hint from an outline template beat; "" when none. */
  guidance: string;
  order_index: number;
}

/** Columns returned by the chapters API (matches the Chapter interface). */
export const CHAPTER_COLUMNS = "id, document_id, parent_id, title, content, synopsis, guidance, order_index";

export interface ChapterNode extends Chapter {
  children: Chapter[];
}

const byOrder = (a: Chapter, b: Chapter) => a.order_index - b.order_index;

/** Two-level tree: top-level chapters, each with its ordered subchapters. */
export function buildChapterTree(chapters: Chapter[]): ChapterNode[] {
  return chapters
    .filter((c) => !c.parent_id)
    .sort(byOrder)
    .map((c) => ({
      ...c,
      children: chapters.filter((s) => s.parent_id === c.id).sort(byOrder),
    }));
}

/** Chapters in reading order (each chapter followed by its subchapters). */
export function flattenChapterTree(tree: ChapterNode[]): Chapter[] {
  return tree.flatMap(({ children, ...c }) => [c, ...children]);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const decodeEntities = (s: string) =>
  s
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

/** Whole manuscript as HTML: chapters as <h1>, subchapters as <h2>. */
export function compileManuscript(chapters: Chapter[]): string {
  return flattenChapterTree(buildChapterTree(chapters))
    .map((c) => `<h${c.parent_id ? 2 : 1}>${escapeHtml(c.title)}</h${c.parent_id ? 2 : 1}>${c.content}`)
    .join("");
}

export function countWords(html: string): number {
  return html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
}

export type DropPosition = "before" | "after" | "inside";

export interface Placement {
  id: string;
  parentId: string | null;
  orderIndex: number;
}

/**
 * Move `dragId` relative to `targetId`. Returns the updated list plus the rows
 * whose parent/order changed, or null if the move is not allowed (we keep two
 * levels: a chapter with subchapters can't itself become a subchapter).
 */
export function moveChapter(
  chapters: Chapter[],
  dragId: string,
  targetId: string,
  position: DropPosition,
): { chapters: Chapter[]; placements: Placement[] } | null {
  if (dragId === targetId) return null;
  const dragged = chapters.find((c) => c.id === dragId);
  const target = chapters.find((c) => c.id === targetId);
  if (!dragged || !target) return null;

  const hasChildren = chapters.some((c) => c.parent_id === dragId);
  const newParent = position === "inside" ? target.id : target.parent_id;
  if (newParent && (hasChildren || newParent === dragId)) return null;
  if (position === "inside" && target.parent_id) return null;

  const siblings = (parent: string | null) =>
    chapters.filter((c) => c.parent_id === parent && c.id !== dragId).sort(byOrder).map((c) => c.id);

  const groups = new Map<string | null, string[]>();
  groups.set(dragged.parent_id, siblings(dragged.parent_id));
  const dest = siblings(newParent);
  const at =
    position === "inside" ? dest.length : dest.indexOf(targetId) + (position === "after" ? 1 : 0);
  dest.splice(at, 0, dragId);
  groups.set(newParent, dest);

  const next = new Map(chapters.map((c) => [c.id, { ...c }]));
  next.get(dragId)!.parent_id = newParent;
  const placements: Placement[] = [];
  for (const [parent, ids] of groups) {
    ids.forEach((id, i) => {
      const c = next.get(id)!;
      const before = chapters.find((o) => o.id === id)!;
      c.order_index = i;
      if (before.order_index !== i || before.parent_id !== parent) {
        placements.push({ id, parentId: parent, orderIndex: i });
      }
    });
  }
  return { chapters: [...next.values()], placements };
}

export interface SeedChapter {
  title: string;
  content: string;
  /** Index into the returned array of this subchapter's parent, or null. */
  parentIndex: number | null;
}

/**
 * Split legacy single-blob HTML into chapters on <h1> and subchapters on <h2>.
 * Text before the first heading becomes its own chapter.
 */
export function splitHtmlIntoChapters(html: string): SeedChapter[] {
  const headingRe = /<h([12])[^>]*>([\s\S]*?)<\/h\1>/gi;
  const out: SeedChapter[] = [];
  let lastChapterIndex: number | null = null;
  let cursor = 0;
  let match: RegExpExecArray | null;

  const appendBody = (body: string) => {
    if (out.length > 0) out[out.length - 1].content += body;
    else if (body.replace(/<[^>]+>/g, "").trim()) {
      out.push({ title: "Chapter 1", content: body, parentIndex: null });
      lastChapterIndex = 0;
    }
  };

  while ((match = headingRe.exec(html))) {
    appendBody(html.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const title = decodeEntities(match[2].replace(/<[^>]+>/g, "")).trim();
    if (match[1] === "1" || lastChapterIndex === null) {
      out.push({ title: title || `Chapter ${out.length + 1}`, content: "", parentIndex: null });
      lastChapterIndex = out.length - 1;
    } else {
      out.push({ title: title || "Untitled Section", content: "", parentIndex: lastChapterIndex });
    }
  }
  appendBody(html.slice(cursor));

  return out.length > 0 ? out : [{ title: "Chapter 1", content: "", parentIndex: null }];
}
