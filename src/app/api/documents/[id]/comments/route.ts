import { createServerClient } from "@/lib/supabase/server";
import { COMMENT_COLUMNS } from "@/lib/comments";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

/** Every comment in the book the caller can see, oldest first. */
export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("chapter_comments")
    .select(COMMENT_COLUMNS)
    .eq("document_id", id)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

/**
 * Add a comment. Body: { id, chapterId, quote, body, authorName }. The client
 * picks the id because the editor marks the text with it before saving.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json()) as {
    id?: string; chapterId?: string; quote?: string; body?: string; authorName?: string;
  };
  const text = body.body?.trim();
  if (!body.id || !body.chapterId || !text) {
    return NextResponse.json({ error: "A comment needs an id, a chapter and some text." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("chapter_comments")
    .insert({
      id: body.id,
      document_id: id,
      chapter_id: body.chapterId,
      user_id: user.id,
      author_name: body.authorName?.slice(0, 120) ?? "",
      quote: body.quote?.slice(0, 2000) ?? "",
      body: text,
    })
    .select(COMMENT_COLUMNS)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
