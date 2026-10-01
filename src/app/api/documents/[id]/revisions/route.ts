import { createServerClient } from "@/lib/supabase/server";
import { REVISION_SUMMARY_COLUMNS, takeSnapshot } from "@/lib/revisions.server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("revisions")
    .select(REVISION_SUMMARY_COLUMNS)
    .eq("document_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/** Snapshot the book as saved. Body: { kind: "auto" | "manual", name?: string }. */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as { kind?: string; name?: string };
  const kind = body.kind === "manual" ? "manual" : "auto";
  const name = body.name?.trim() || null;

  try {
    const revision = await takeSnapshot(supabase, id, user.id, kind, name);
    return NextResponse.json(revision ?? { skipped: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
