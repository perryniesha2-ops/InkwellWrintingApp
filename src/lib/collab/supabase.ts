import type { SupabaseClient } from "@supabase/supabase-js";
import { MESSAGE_EVENTS, type CollabStore, type CollabTransport, type Message, type StoredUpdate } from "@/lib/collab/provider";

const PAGE = 1000; // PostgREST's default max rows per request
/** Updates younger than this aren't compacted (see CollabStore.settledUpto). */
const SETTLE_MS = 60_000;

/** Realtime broadcast channel for one chapter's live edits and cursors. */
export function supabaseTransport(supabase: SupabaseClient, chapterId: string): CollabTransport {
  const channel = supabase.channel(`chapter:${chapterId}`, {
    config: { broadcast: { self: false, ack: false } },
  });
  return {
    connect(onMessage, onStatus) {
      for (const event of MESSAGE_EVENTS) {
        channel.on("broadcast", { event }, ({ payload }) => onMessage({ event, payload } as Message));
      }
      channel.subscribe((status) => onStatus(status === "SUBSCRIBED"));
    },
    send(msg) {
      void channel.send({ type: "broadcast", event: msg.event, payload: msg.payload });
    },
    disconnect() {
      void supabase.removeChannel(channel);
    },
  };
}

/** Yjs persistence in `chapters.ydoc` (snapshot) + `chapter_updates` (log). */
export function supabaseStore(supabase: SupabaseClient, chapterId: string): CollabStore {
  const loadSince = async (afterId: number): Promise<StoredUpdate[]> => {
    const out: StoredUpdate[] = [];
    for (let from = afterId; ; ) {
      const { data, error } = await supabase
        .from("chapter_updates")
        .select("id, update")
        .eq("chapter_id", chapterId)
        .gt("id", from)
        .order("id")
        .limit(PAGE);
      if (error) throw error;
      out.push(...(data as StoredUpdate[]));
      if (!data || data.length < PAGE) return out;
      from = (data[data.length - 1] as StoredUpdate).id;
    }
  };

  return {
    async load() {
      const { data, error } = await supabase
        .from("chapters")
        .select("ydoc, ydoc_upto, ydoc_seeded")
        .eq("id", chapterId)
        .single();
      if (error) throw error;
      const upto = Number(data.ydoc_upto ?? 0);
      return { snapshot: data.ydoc, upto, seeded: data.ydoc_seeded, updates: await loadSince(upto) };
    },
    loadSince,
    async append(update) {
      const { data, error } = await supabase
        .from("chapter_updates")
        .insert({ chapter_id: chapterId, update })
        .select("id")
        .single();
      if (error) throw error;
      return Number(data.id);
    },
    async claimSeed() {
      const { data } = await supabase
        .from("chapters")
        .update({ ydoc_seeded: true })
        .eq("id", chapterId)
        .eq("ydoc_seeded", false)
        .select("id");
      return (data?.length ?? 0) === 1;
    },
    async settledUpto(maxId) {
      const { data } = await supabase
        .from("chapter_updates")
        .select("id")
        .eq("chapter_id", chapterId)
        .lte("id", maxId)
        .lt("created_at", new Date(Date.now() - SETTLE_MS).toISOString())
        .order("id", { ascending: false })
        .limit(1);
      return Number(data?.[0]?.id ?? 0);
    },
    async compact(snapshot, upto, prevUpto) {
      const { data } = await supabase
        .from("chapters")
        .update({ ydoc: snapshot, ydoc_upto: upto })
        .eq("id", chapterId)
        .eq("ydoc_upto", prevUpto)
        .select("id");
      if (data?.length === 1) {
        await supabase.from("chapter_updates").delete().eq("chapter_id", chapterId).lte("id", upto);
        return upto;
      }
      const { data: current } = await supabase.from("chapters").select("ydoc_upto").eq("id", chapterId).single();
      return Number(current?.ydoc_upto ?? prevUpto);
    },
  };
}
