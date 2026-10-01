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
    .eq("id", id)
    .single();

  if (error || !doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Owner, or a collaborator on the whole book / specific chapters.
  let access: { role: "owner" | "editor"; scope: "book" | "chapters" } = { role: "owner", scope: "book" };
  if (doc.user_id !== user.id) {
    const { data: memberships } = await supabase
      .from("document_members")
      .select("chapter_id")
      .eq("document_id", id)
      .eq("user_id", user.id);
    access = { role: "editor", scope: memberships?.some((m) => m.chapter_id === null) ? "book" : "chapters" };
  }
  return NextResponse.json({ ...doc, access });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json() as Record<string, unknown>;

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in body)      updateData.title       = body.title;
  if ("content" in body)    updateData.content     = body.content;
  if ("genre" in body)      updateData.genre       = body.genre ?? null;
  if ("wordCount" in body)  updateData.word_count  = body.wordCount ?? 0;
  if ("coverImage" in body) updateData.cover_image = body.coverImage ?? null;

  const { data: doc, error } = await supabase
    .from("documents")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(doc);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { error } = await supabase
    .from("documents")
    .delete()
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}