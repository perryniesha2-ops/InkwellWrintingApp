import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import type { ProofParagraph } from "@/lib/proofread";
import { MAX_SECTION_CHARS, ProofreadError, proofreadSection } from "@/lib/proofread.server";

type RouteParams = { params: Promise<{ id: string }> };

export const maxDuration = 300;

/**
 * Proofread one section of a chapter (the client splits a chapter into
 * sections and sends them in parallel).
 * Body: { chapterId, chapterTitle, genre?, paragraphs: [{ n, text }] }.
 */
export async function POST(req: Request, { params }: RouteParams) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    chapterId?: string; chapterTitle?: string; genre?: string | null; paragraphs?: ProofParagraph[];
  };
  const paragraphs = (body.paragraphs ?? []).filter(
    (p) => Number.isInteger(p?.n) && typeof p?.text === "string" && p.text.trim(),
  );
  if (!body.chapterId || !paragraphs.length) {
    return NextResponse.json({ error: "Nothing to proofread." }, { status: 400 });
  }
  if (paragraphs.reduce((n, p) => n + p.text.length, 0) > MAX_SECTION_CHARS * 1.5) {
    return NextResponse.json({ error: "This section is too long." }, { status: 413 });
  }

  // Only people who can edit the chapter may proofread it.
  const { data: chapter } = await supabase
    .from("chapters")
    .select("id")
    .eq("id", body.chapterId)
    .eq("document_id", id)
    .maybeSingle();
  if (!chapter) return NextResponse.json({ error: "Chapter not found." }, { status: 404 });

  try {
    const suggestions = await proofreadSection(paragraphs, body.chapterTitle ?? "", body.genre ?? null);
    return NextResponse.json({ suggestions });
  } catch (err) {
    if (err instanceof ProofreadError) return NextResponse.json({ error: err.message }, { status: 502 });
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "The AI service is busy. Try again in a minute." }, { status: 429 });
    }
    console.error("proofread failed:", err);
    return NextResponse.json({ error: "The proofreader couldn't check this section." }, { status: 502 });
  }
}
