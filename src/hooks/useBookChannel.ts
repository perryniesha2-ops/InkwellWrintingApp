"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { CollabUser } from "@/lib/collab/identity";

export interface Peer extends CollabUser {
  chapterId: string | null;
}

/**
 * One Realtime channel per book: presence (who's here and which chapter they
 * have open) plus notifications that the chapter list changed or a revision
 * was restored, so other browsers can refresh.
 */
export function useBookChannel(
  documentId: string | undefined,
  me: CollabUser | null,
  activeChapterId: string | null,
  handlers: { onTreeChanged: () => void; onReload: () => void },
) {
  const [peers, setPeers] = useState<Peer[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; }, [handlers]);
  const chapterRef = useRef(activeChapterId);

  useEffect(() => {
    if (!documentId || !me) return;
    const supabase = createClient();
    const channel = supabase.channel(`book:${documentId}`, {
      config: { presence: { key: me.id }, broadcast: { self: false } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<Peer>();
        // One entry per person (they may have several tabs open).
        const byUser = new Map<string, Peer>();
        for (const metas of Object.values(state)) {
          for (const p of metas) if (p.id !== me.id) byUser.set(p.id, p);
        }
        setPeers([...byUser.values()]);
      })
      .on("broadcast", { event: "tree-changed" }, () => handlersRef.current.onTreeChanged())
      .on("broadcast", { event: "reload" }, () => handlersRef.current.onReload())
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void channel.track({ ...me, chapterId: chapterRef.current });
      });
    channelRef.current = channel;
    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [documentId, me]);

  // Update which chapter we're in.
  useEffect(() => {
    chapterRef.current = activeChapterId;
    if (me) void channelRef.current?.track({ ...me, chapterId: activeChapterId });
  }, [activeChapterId, me]);

  const notify = (event: "tree-changed" | "reload") => {
    void channelRef.current?.send({ type: "broadcast", event, payload: {} });
  };

  return { peers, notify };
}
