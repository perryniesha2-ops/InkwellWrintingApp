import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { IssueState } from "@/lib/plotCheck";

type RouteParams = { params: Promise<{ id: string; checkId: string }> };

/** Mark an issue. Body: { issueId: string, state: "fixed" | "dismissed" | null }. */
export async function PATCH(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, checkId } = await params;
  const body = (await req.json().catch(() => ({}))) as { issueId?: string; state?: IssueState | null };
  if (!body.issueId || (body.state !== null && body.state !== "fixed" && body.state !== "dismissed")) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { data: row, error } = await supabase
    .from("plot_checks")
    .select("issue_states")
    .eq("id", checkId)
    .eq("document_id", id)
    .single();
  if (error || !row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const states = { ...((row.issue_states as Record<string, IssueState> | null) ?? {}) };
  if (body.state) states[body.issueId] = body.state;
  else delete states[body.issueId];

  const { error: updateError } = await supabase.from("plot_checks").update({ issue_states: states }).eq("id", checkId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
  return NextResponse.json({ issueStates: states });
}
