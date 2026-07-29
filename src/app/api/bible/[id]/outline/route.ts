import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: bibleId } = await params;
  const body = await req.json();

  const { data: section, error } = await supabase
    .from("outline_sections")
    .insert({
      bible_id: bibleId,
      user_id: user.id,
      title: body.title ?? "New Chapter",
      type: body.type ?? "chapter",
      order_index: body.orderIndex ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(section);
}