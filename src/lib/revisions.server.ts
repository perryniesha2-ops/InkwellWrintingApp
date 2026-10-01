import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { compileManuscript, countWords, type Chapter } from "@/lib/chapters";

export type RevisionKind = "auto" | "manual" | "backup";

/** Columns for revision lists (everything except the heavy snapshot). */
export const REVISION_SUMMARY_COLUMNS = "id, name, kind, word_count, created_at";

/** Auto revisions older than this are thinned to the newest one per day. */
const KEEP_ALL_AUTO_FOR_DAYS = 7;

/**
 * Snapshot the document as currently saved in the database. Auto snapshots are
 * skipped (returns null) when nothing changed since the latest revision.
 */
export async function takeSnapshot(
  supabase: SupabaseClient,
  documentId: string,
  userId: string,
  kind: RevisionKind,
  name: string | null = null,
) {
  const [{ data: doc, error: docError }, { data: chapters, error: chError }] = await Promise.all([
    supabase.from("documents").select("title").eq("id", documentId).single(),
    supabase
      .from("chapters")
      .select("id, parent_id, title, content, synopsis, guidance, order_index")
      .eq("document_id", documentId)
      .order("order_index"),
  ]);
  if (docError || chError || !doc) throw new Error(docError?.message ?? chError?.message ?? "Not found");

  const snapshot = { title: doc.title as string, chapters: chapters ?? [] };
  const contentHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

  if (kind === "auto") {
    const { data: latest } = await supabase
      .from("revisions")
      .select("content_hash")
      .eq("document_id", documentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.content_hash === contentHash) return null;
  }

  const manuscript = compileManuscript(
    (chapters ?? []).map((c) => ({ ...c, document_id: documentId }) as Chapter),
  );
  const { data: revision, error } = await supabase
    .from("revisions")
    .insert({
      document_id: documentId,
      user_id: userId,
      name,
      kind,
      snapshot,
      manuscript,
      word_count: countWords(manuscript),
      content_hash: contentHash,
    })
    .select(REVISION_SUMMARY_COLUMNS)
    .single();
  if (error) throw new Error(error.message);

  if (kind === "auto") await thinAutoRevisions(supabase, documentId);
  return revision;
}

/** Keep every recent auto revision; older ones only the last of each day. */
async function thinAutoRevisions(supabase: SupabaseClient, documentId: string) {
  const cutoff = new Date(Date.now() - KEEP_ALL_AUTO_FOR_DAYS * 86_400_000).toISOString();
  const { data: old } = await supabase
    .from("revisions")
    .select("id, created_at")
    .eq("document_id", documentId)
    .eq("kind", "auto")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: false });
  if (!old?.length) return;

  const seenDays = new Set<string>();
  const remove = old
    .filter((r) => {
      const day = (r.created_at as string).slice(0, 10);
      if (seenDays.has(day)) return true;
      seenDays.add(day);
      return false;
    })
    .map((r) => r.id as string);
  if (remove.length) await supabase.from("revisions").delete().in("id", remove);
}
