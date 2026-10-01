import { createServerClient } from "@/lib/supabase/server";
import { takeSnapshot } from "@/lib/revisions.server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; revisionId: string }> };

/**
 * Restore a revision. The current state is snapshotted first as a "backup"
 * revision, so a restore can always be undone by restoring that backup.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;

  const { data: target } = await supabase
    .from("revisions")
    .select("name, created_at")
    .eq("id", revisionId)
    .eq("document_id", id)
    .single();
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // The client sends the revision's time formatted in the writer's timezone.
  const body = (await req.json().catch(() => ({}))) as { label?: string };
  const label = target.name ? `“${target.name}”` : body.label?.slice(0, 80) || target.created_at;

  try {
    await takeSnapshot(supabase, id, user.id, "backup", `Before restoring ${label}`);
  } catch (err) {
    return NextResponse.json({ error: `Backup failed: ${(err as Error).message}` }, { status: 500 });
  }

  const { error } = await supabase.rpc("restore_revision", { p_revision_id: revisionId });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
