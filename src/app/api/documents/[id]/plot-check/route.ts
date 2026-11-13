import { after, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  PLOT_CHECK_COLUMNS, STALE_RUNNING_MS, fromPlotCheckRow, type PlotCheckRow,
} from "@/lib/plotCheck";
import {
  PLOT_CHECK_MODEL, PlotCheckError, loadManuscript, prepareInput, runPlotCheck,
} from "@/lib/plotCheck.server";

type RouteParams = { params: Promise<{ id: string }> };

// The check keeps running after the response is sent (see `after` below).
export const maxDuration = 300;

/** The most recent check for this book (null if none). */
export async function GET(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("plot_checks")
    .select(PLOT_CHECK_COLUMNS)
    .eq("document_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json(null);

  const check = fromPlotCheckRow(data as PlotCheckRow);
  // A run cut off by the server's time limit never records that it stopped.
  if (check.status === "running" && Date.now() - new Date(check.createdAt).getTime() > STALE_RUNNING_MS) {
    const stopped = { status: "failed", error: "The check took too long and was stopped. Try checking one chapter at a time." } as const;
    await supabase.from("plot_checks").update({ ...stopped, finished_at: new Date().toISOString() }).eq("id", check.id);
    return NextResponse.json({ ...check, ...stopped, result: check.result });
  }
  return NextResponse.json(check);
}

/** Start a check. Body: { scope: "book" | "chapter", chapterId?: string }. */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { scope?: string; chapterId?: string };
  const scope = body.scope === "chapter" ? "chapter" : "book";
  const chapterId = scope === "chapter" ? body.chapterId ?? null : null;
  if (scope === "chapter" && !chapterId) {
    return NextResponse.json({ error: "Choose a chapter to check." }, { status: 400 });
  }

  // One check at a time per book.
  const { data: running } = await supabase
    .from("plot_checks")
    .select("id, created_at")
    .eq("document_id", id)
    .eq("status", "running")
    .gt("created_at", new Date(Date.now() - STALE_RUNNING_MS).toISOString())
    .limit(1)
    .maybeSingle();
  if (running) return NextResponse.json({ error: "A check is already running for this book." }, { status: 409 });

  let manuscript: Awaited<ReturnType<typeof loadManuscript>>;
  let input: ReturnType<typeof prepareInput>;
  try {
    manuscript = await loadManuscript(supabase, id);
    input = prepareInput(manuscript, chapterId);
  } catch (err) {
    const message = err instanceof PlotCheckError ? err.message : "Couldn't read this book.";
    return NextResponse.json({ error: message }, { status: err instanceof PlotCheckError ? 400 : 500 });
  }

  const { data: row, error } = await supabase
    .from("plot_checks")
    .insert({
      document_id: id,
      user_id: user.id,
      scope,
      chapter_id: chapterId,
      word_count: manuscript.wordCount,
      model: PLOT_CHECK_MODEL,
      progress: {},
    })
    .select(PLOT_CHECK_COLUMNS)
    .single();
  if (error || !row) {
    // RLS: only the owner and whole-book collaborators can run checks.
    return NextResponse.json({ error: error?.message ?? "Couldn't start the check." }, { status: 403 });
  }

  after(() => runPlotCheck(supabase, row.id as string, manuscript, input));
  return NextResponse.json(fromPlotCheckRow(row as PlotCheckRow));
}
