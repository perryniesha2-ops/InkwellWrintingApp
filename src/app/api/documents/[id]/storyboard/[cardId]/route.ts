import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; cardId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;
  const body = await req.json();

  const updateData: Record<string, unknown> = {};
  if ("title" in body)      updateData.title       = body.title;
  if ("notes" in body)      updateData.notes       = body.notes ?? null;
  if ("imageUrl" in body)   updateData.image_url   = body.imageUrl ?? null;
  if ("orderIndex" in body) updateData.order_index = body.orderIndex;

  const { data: card, error } = await supabase
    .from("storyboard_cards")
    .update(updateData)
    .eq("id", cardId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(card);
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { cardId } = await params;

  const { error } = await supabase
    .from("storyboard_cards")
    .delete()
    .eq("id", cardId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}