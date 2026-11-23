import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

/** Keys of rejected suggestions for a chapter. Query: ?chapterId= */
export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chapterId = new URL(req.url).searchParams.get("chapterId");
  if (!chapterId) return NextResponse.json({ error: "chapterId is required" }, { status: 400 });

  const { data, error } = await supabase
    .from("proofread_ignores")
    .select("key")
    .eq("document_id", id)
    .eq("chapter_id", chapterId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ keys: (data ?? []).map((r) => r.key as string) });
}

/** Remember a rejected suggestion. Body: { chapterId, key, original, replacement }. */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    chapterId?: string; key?: string; original?: string; replacement?: string;
  };
  if (!body.chapterId || !body.key) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const { error } = await supabase.from("proofread_ignores").upsert(
    {
      document_id: id,
      chapter_id: body.chapterId,
      user_id: user.id,
      key: body.key.slice(0, 500),
      original: (body.original ?? "").slice(0, 500),
      replacement: (body.replacement ?? "").slice(0, 500),
    },
    { onConflict: "chapter_id,key", ignoreDuplicates: true },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

/** Forget every rejected suggestion for a chapter. Query: ?chapterId= */
export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const chapterId = new URL(req.url).searchParams.get("chapterId");
  if (!chapterId) return NextResponse.json({ error: "chapterId is required" }, { status: 400 });

  const { error } = await supabase.from("proofread_ignores").delete().eq("document_id", id).eq("chapter_id", chapterId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
