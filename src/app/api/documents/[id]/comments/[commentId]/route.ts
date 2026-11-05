import { createServerClient } from "@/lib/supabase/server";
import { COMMENT_COLUMNS } from "@/lib/comments";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; commentId: string }> };

/** Edit or resolve. Body: { body?: string, resolved?: boolean }. Only the author can edit the text. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, commentId } = await params;
  const body = (await req.json()) as { body?: string; resolved?: boolean };

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.resolved === "boolean") update.resolved = body.resolved;

  let query = supabase.from("chapter_comments").update(update).eq("id", commentId).eq("document_id", id);
  if (typeof body.body === "string") {
    const text = body.body.trim();
    if (!text) return NextResponse.json({ error: "A comment can't be empty." }, { status: 400 });
    update.body = text;
    query = query.eq("user_id", user.id);
  }

  const { data, error } = await query.select(COMMENT_COLUMNS).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "You can only edit your own comments." }, { status: 403 });
  return NextResponse.json(data);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, commentId } = await params;
  const { data, error } = await supabase
    .from("chapter_comments")
    .delete()
    .eq("id", commentId)
    .eq("document_id", id)
    .select("id");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data?.length) return NextResponse.json({ error: "Only the author or the book's owner can delete this comment." }, { status: 403 });
  return NextResponse.json({ success: true });
}
