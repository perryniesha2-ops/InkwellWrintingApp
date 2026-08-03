import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const body = await req.json();
 const {
  id, bibleId, userId, createdAt,
  bible_id, user_id, created_at,
  ...rest
} = body;

const toSnake = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const updateData: Record<string, unknown> = {};
for (const [key, value] of Object.entries(rest)) {
  updateData[toSnake(key)] = value;
}

const { data: note, error } = await supabase
  .from("bible_notes")
  .update(updateData)
  .eq("id", noteId)
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(note);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { noteId } = await params;
  const { error } = await supabase.from("bible_notes").delete().eq("id", noteId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}