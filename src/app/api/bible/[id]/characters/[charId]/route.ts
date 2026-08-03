import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; charId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { charId } = await params;
  const body = await req.json();

  // Replace the update block with:
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

const { data: char, error } = await supabase
  .from("characters")
  .update(updateData)
  .eq("id", charId)
  .select()
  .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(char);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { charId } = await params;

  const { error } = await supabase.from("characters").delete().eq("id", charId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}