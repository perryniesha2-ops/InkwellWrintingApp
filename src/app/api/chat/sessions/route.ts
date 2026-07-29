import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json([], { status: 401 });

  const url = new URL(req.url);
  const documentId = url.searchParams.get("documentId");
  if (!documentId) return NextResponse.json([]);

  const { data: sessions } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("document_id", documentId)
    .order("updated_at", { ascending: false });

  return NextResponse.json(sessions ?? []);
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { documentId, title } = await req.json();

  const { data: session, error } = await supabase
    .from("chat_sessions")
    .insert({
      document_id: documentId,
      user_id: user.id,
      title: title ?? "New Chat",
      message_count: 0,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(session);
}