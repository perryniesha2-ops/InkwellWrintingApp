import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const { id } = await params;

  const { data: sections, error } = await supabase
    .from("document_sections")
    .select("*")
    .eq("document_id", id)
    .eq("enabled", true)
    .order("created_at");

  if (error) return NextResponse.json([], { status: 500 });
  return NextResponse.json(sections);
}

export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const { data: section, error } = await supabase
    .from("document_sections")
    .insert({
      document_id: id,
      user_id: user.id,
      type: body.type,
      title: body.title ?? "",
      content: body.content ?? "",
      enabled: body.enabled ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(section);
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { sectionId, ...updateData } = body;

  const { data: section, error } = await supabase
    .from("document_sections")
    .update(updateData)
    .eq("id", sectionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(section);
}