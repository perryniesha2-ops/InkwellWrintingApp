import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; entryId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;
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

const { data: entry, error } = await supabase
  .from("world_entries")
  .update(updateData)
  .eq("id", entryId)
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(entry);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { entryId } = await params;
  const { error } = await supabase.from("world_entries").delete().eq("id", entryId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}