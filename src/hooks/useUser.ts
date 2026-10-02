"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // Supabase re-emits auth events on tab refocus and token refresh with a
    // fresh (but identical) user object. Keep the existing object unless the
    // user really changed, so effects depending on `user` don't re-run and
    // reload pages mid-edit.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const next = session?.user ?? null;
        setUser((prev) =>
          prev && next && prev.id === next.id && prev.updated_at === next.updated_at ? prev : next,
        );
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}