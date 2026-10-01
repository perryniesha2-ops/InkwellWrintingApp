import type { User } from "@supabase/supabase-js";

export interface CollabUser {
  id: string;
  name: string;
  color: string;
}

// Distinct, readable on both light and dark editor themes.
const COLORS = ["#e2a03f", "#4f9dde", "#d1607a", "#5bb98c", "#a07ad8", "#e07b4f", "#3fb5b0", "#c9a227"];

export function colorFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export function collabUser(user: User): CollabUser {
  const meta = user.user_metadata as { full_name?: string; name?: string } | undefined;
  const name = meta?.full_name || meta?.name || user.email?.split("@")[0] || "Writer";
  return { id: user.id, name, color: colorFor(user.id) };
}
