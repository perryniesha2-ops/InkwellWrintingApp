"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { createClient } from "@/lib/supabase/client";
import { ChapterCollabProvider, type ConnectionStatus } from "@/lib/collab/provider";
import { supabaseStore, supabaseTransport } from "@/lib/collab/supabase";

export interface ChapterCollabSession {
  doc: Y.Doc;
  provider: ChapterCollabProvider;
}

/**
 * Yjs doc + provider for one chapter, created in an effect (not at render) so
 * React's mount/unmount/remount in development doesn't reuse a destroyed one.
 */
export function useChapterCollab(chapterId: string | null) {
  const [session, setSession] = useState<ChapterCollabSession | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chapterId) return;
    const supabase = createClient();
    const doc = new Y.Doc();
    const provider = new ChapterCollabProvider(doc, supabaseTransport(supabase, chapterId), supabaseStore(supabase, chapterId));
    const offStatus = provider.onStatus(setStatus);
    let cancelled = false;
    // Publish the session once saved state is loaded, so the editor never
    // shows (or lets anyone type into) an empty chapter while it loads.
    void provider.start().then(
      () => {
        if (!cancelled) {
          setError(null);
          setSession({ doc, provider });
        }
      },
      (err) => {
        console.error("Couldn't load chapter for live editing:", err);
        if (!cancelled) setError("This chapter couldn't be loaded. Check your connection and reopen it.");
      },
    );

    // Best-effort save if the tab closes with unsaved keystrokes.
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (!provider.hasPendingChanges) return;
      void provider.flush();
      e.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      cancelled = true;
      window.removeEventListener("beforeunload", beforeUnload);
      offStatus();
      setSession(null);
      void provider.destroy().finally(() => doc.destroy());
    };
  }, [chapterId]);

  return { session, status, error };
}
