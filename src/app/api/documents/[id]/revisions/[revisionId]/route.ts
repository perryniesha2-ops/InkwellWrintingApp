import { createServerClient } from "@/lib/supabase/server";
import { REVISION_SUMMARY_COLUMNS } from "@/lib/revisions.server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; revisionId: string }> };

/** Full revision, including the manuscript for previewing. */
export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;
  const { data, error } = await supabase
    .from("revisions")
    .select(`${REVISION_SUMMARY_COLUMNS}, manuscript, snapshot`)
    .eq("id", revisionId)
    .eq("document_id", id)
    .single();

  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}

/** Rename. Body: { name: string | null }. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;
  const { name } = (await req.json()) as { name?: string | null };

  // Naming an auto revision promotes it so thinning never deletes it.
  const update: Record<string, unknown> = { name: name?.trim() || null };
  if (name?.trim()) update.kind = "manual";

  const { data, error } = await supabase
    .from("revisions")
    .update(update)
    .eq("id", revisionId)
    .eq("document_id", id)
    .select(REVISION_SUMMARY_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, revisionId } = await params;
  const { error } = await supabase.from("revisions").delete().eq("id", revisionId).eq("document_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
