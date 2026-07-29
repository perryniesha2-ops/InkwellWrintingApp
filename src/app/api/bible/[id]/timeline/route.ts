import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bibleId } = await params;
  const body = await req.json();

  const { data: event, error } = await supabase
    .from("timeline_events")
    .insert({
      bible_id: bibleId,
      user_id: user.id,
      order_index: body.orderIndex ?? 0,
      time_label: body.timeLabel ?? "Day 1",
      title: body.title ?? "New Event",
      description: body.description ?? "",
      characters: body.characters ?? [],
      location: body.location ?? "",
      chapter_ref: body.chapterRef ?? "",
      type: body.type ?? "event",
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(event);
}