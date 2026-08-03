import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; sectionId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;
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
    updateData[toSnake(key)] = value === "" ? null : value;
  }

  console.log("Updating section:", sectionId, Object.keys(updateData));

  const { data: section, error } = await supabase
    .from("outline_sections")
    .update(updateData)
    .eq("id", sectionId)
    .select()
    .single();

  if (error) {
    console.error("Outline PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(section);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sectionId } = await params;

  const { error } = await supabase
    .from("outline_sections")
    .delete()
    .eq("id", sectionId);

  if (error) {
    console.error("Outline DELETE error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}