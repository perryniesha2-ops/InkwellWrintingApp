import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { MAX_OUTLINE_HTML_CHARS, MAX_OUTLINE_TITLE_CHARS } from "@/lib/outlineDocs";

type RouteParams = { params: Promise<{ id: string; outlineId: string }> };

/**
 * Rename an outline ({ title }) or replace it with a new version of the file
 * ({ content, fileName, wordCount }).
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, outlineId } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown; fileName?: unknown; content?: unknown; wordCount?: unknown;
  };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.title === "string") {
    if (!body.title.trim()) return NextResponse.json({ error: "Give the outline a title." }, { status: 400 });
    update.title = body.title.trim().slice(0, MAX_OUTLINE_TITLE_CHARS);
  }
  if ("content" in body) {
    if (typeof body.content !== "string" || !body.content.trim() || body.content.length > MAX_OUTLINE_HTML_CHARS) {
      return NextResponse.json({ error: "That outline is empty or too long." }, { status: 400 });
    }
    update.content = body.content;
    update.word_count = Number.isInteger(body.wordCount) ? body.wordCount : 0;
    update.file_name = typeof body.fileName === "string" ? body.fileName.slice(0, 255) : null;
  }

  const { data, error } = await supabase
    .from("outline_documents")
    .update(update)
    .eq("id", outlineId)
    .eq("document_id", id)
    .select("id, title, file_name, content, word_count, created_at, updated_at")
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Outline not found, or you can't change it." }, { status: 404 });
  return NextResponse.json({ outline: data });
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, outlineId } = await params;
  const { data, error } = await supabase
    .from("outline_documents")
    .delete()
    .eq("id", outlineId)
    .eq("document_id", id)
    .select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Outline not found, or you can't delete it." }, { status: 404 });
  return NextResponse.json({ success: true });
}
