import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: doc, error } = await supabase
    .from("documents")
    .select("*")
    .eq("id", id)           // ← filter by id column
    .eq("user_id", user.id) // ← RLS handles this but explicit is safer
    .single();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(doc);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;
    const body = await req.json() as Record<string, unknown>;

    // Build update object with snake_case column names
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if ("title" in body)      updateData.title       = body.title;
    if ("content" in body)    updateData.content     = body.content;
    if ("genre" in body)      updateData.genre       = body.genre ?? null;
    if ("wordCount" in body)  updateData.word_count  = body.wordCount ?? 0;
    if ("coverImage" in body) updateData.cover_image = body.coverImage ?? null;

    const { data: doc, error } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", id)            // ← filter by id
      .eq("user_id", user.id)  // ← ensure ownership
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(doc);
  } catch (err) {
    console.error("Document PATCH error:", err);
    return NextResponse.json(
      { error: "Failed to update document", detail: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await params;

    const { error } = await supabase
      .from("documents")
      .delete()
      .eq("id", id)           // ← was "documentUser" which is wrong
      .eq("user_id", user.id); // ← ensure ownership

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Document DELETE error:", err);
    return NextResponse.json(
      { error: "Failed to delete document", detail: String(err) },
      { status: 500 }
    );
  }
}