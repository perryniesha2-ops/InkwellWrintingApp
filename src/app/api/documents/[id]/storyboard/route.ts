import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const { data: cards, error } = await supabase
    .from("storyboard_cards")
    .select("*")
    .eq("document_id", id)
    .order("order_index");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(cards ?? []);
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data: card, error } = await supabase
    .from("storyboard_cards")
    .insert({
      document_id: id,
      user_id: user.id,
      title: body.title ?? "New Scene",
      notes: body.notes ?? "",
      image_url: body.imageUrl ?? null,
      order_index: body.orderIndex ?? 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(card);
}