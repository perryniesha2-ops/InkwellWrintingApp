import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { MAX_OUTLINE_HTML_CHARS, MAX_OUTLINE_TITLE_CHARS } from "@/lib/outlineDocs";

type RouteParams = { params: Promise<{ id: string }> };

/** The book's uploaded outlines, oldest first. */
export async function GET(_req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("outline_documents")
    .select("id, title, file_name, content, word_count, created_at, updated_at")
    .eq("document_id", id)
    .order("created_at");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ outlines: data ?? [] });
}

/** Add an outline converted from a .docx. Body: { title, fileName, content, wordCount }. */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    title?: unknown; fileName?: unknown; content?: unknown; wordCount?: unknown;
  };
  if (typeof body.content !== "string" || !body.content.trim() || body.content.length > MAX_OUTLINE_HTML_CHARS) {
    return NextResponse.json({ error: "That outline is empty or too long." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("outline_documents")
    .insert({
      document_id: id,
      user_id: user.id,
      title: typeof body.title === "string" && body.title.trim() ? body.title.trim().slice(0, MAX_OUTLINE_TITLE_CHARS) : "Outline",
      file_name: typeof body.fileName === "string" ? body.fileName.slice(0, 255) : null,
      content: body.content,
      word_count: Number.isInteger(body.wordCount) ? body.wordCount : 0,
    })
    .select("id, title, file_name, content, word_count, created_at, updated_at")
    .single();
  if (error) {
    const denied = error.code === "42501";
    return NextResponse.json(
      { error: denied ? "You don't have permission to add outlines to this book." : error.message },
      { status: denied ? 403 : 500 },
    );
  }
  return NextResponse.json({ outline: data });
}
