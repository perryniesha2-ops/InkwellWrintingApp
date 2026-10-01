import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string; chapterId: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, chapterId } = await params;
  const body = (await req.json()) as Record<string, unknown>;

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if ("title" in body)    updateData.title    = body.title;
  if ("content" in body)  updateData.content  = body.content;
  if ("synopsis" in body) updateData.synopsis = body.synopsis;
  if ("guidance" in body) updateData.guidance = body.guidance;

  const { error } = await supabase
    .from("chapters")
    .update(updateData)
    .eq("id", chapterId)
    .eq("document_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, chapterId } = await params;

  // Subchapters are removed by the parent_id cascade.
  const { error } = await supabase
    .from("chapters")
    .delete()
    .eq("id", chapterId)
    .eq("document_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
