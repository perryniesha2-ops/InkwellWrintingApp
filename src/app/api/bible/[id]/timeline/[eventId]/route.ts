import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; eventId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;
  const body = await req.json();

  const {
    id, bibleId, userId, createdAt,
    bible_id, user_id, created_at,
    ...rest
  } = body;

  // Convert camelCase to snake_case
  const toSnake = (str: string) =>
    str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

  const updateData: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rest)) {
    updateData[toSnake(key)] = value === "" ? null : value;
  }

  console.log("Timeline update:", eventId, updateData);

  const { data: event, error } = await supabase
    .from("timeline_events")
    .update(updateData)
    .eq("id", eventId)
    .select()
    .single();

  if (error) {
    console.error("Timeline PATCH error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(event);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { eventId } = await params;

  const { error } = await supabase
    .from("timeline_events")
    .delete()
    .eq("id", eventId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}