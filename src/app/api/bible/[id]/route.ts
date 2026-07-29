import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Get or create bible
  let { data: bible } = await supabase
    .from("story_bibles")
    .select("*")
    .eq("document_id", id)
    .single();

  if (!bible) {
    const { data: newBible } = await supabase
      .from("story_bibles")
      .insert({ document_id: id, user_id: user.id })
      .select()
      .single();
    bible = newBible;
  }

  if (!bible) return NextResponse.json({ error: "Failed to create bible" }, { status: 500 });

  const { data: doc } = await supabase
    .from("documents")
    .select("title")
    .eq("id", id)
    .single();

  const [
    { data: chars },
    { data: outline },
    { data: world },
    { data: notes },
    { data: timeline },
  ] = await Promise.all([
    supabase.from("characters").select("*").eq("bible_id", bible.id),
    supabase.from("outline_sections").select("*").eq("bible_id", bible.id).order("order_index"),
    supabase.from("world_entries").select("*").eq("bible_id", bible.id),
    supabase.from("bible_notes").select("*").eq("bible_id", bible.id),
    supabase.from("timeline_events").select("*").eq("bible_id", bible.id).order("order_index"),
  ]);

  return NextResponse.json({
    bible,
    characters: chars ?? [],
    outline: outline ?? [],
    world: world ?? [],
    notes: notes ?? [],
    timeline: timeline ?? [],
    docTitle: doc?.title ?? "Your Story",
  });
}