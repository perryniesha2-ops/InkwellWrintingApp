import { createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ManuscriptRequest {
  documentId: string;
  mode: "full" | "selection" | "chapter";
  selectedText?: string;
  chapterId?: string;
  userMessage: string;
  sessionHistory: { role: "user" | "assistant"; content: string }[];
  bibleContext?: string;
  genre?: string;
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json() as ManuscriptRequest;
    const {
      documentId, mode, selectedText,
      userMessage, sessionHistory, bibleContext, genre,
    } = body;

    // Fetch document
    const { data: doc } = await supabase
      .from("documents")
      .select("title, content, genre")
      .eq("id", documentId)
      .single();

    if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    // Build manuscript context based on mode
    let manuscriptContext = "";
    const docGenre = genre ?? doc.genre ?? "fiction";

    if (mode === "selection" && selectedText) {
      // Semantic chunk — just the selection
      manuscriptContext = `
SELECTED PASSAGE FOR REVIEW:
═══════════════════════════════
${selectedText}
═══════════════════════════════`;
    } else if (mode === "full") {
      // Full manuscript — strip HTML
      const fullText = (doc.content ?? "")
        .replace(/<h1[^>]*>(.*?)<\/h1>/gi, "\n\n# $1\n")
        .replace(/<h2[^>]*>(.*?)<\/h2>/gi, "\n\n## $1\n")
        .replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&nbsp;/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      const wordCount = fullText.split(/\s+/).filter(Boolean).length;

      manuscriptContext = `
FULL MANUSCRIPT: "${doc.title}"
Word count: ${wordCount.toLocaleString()} words
Genre: ${docGenre}
═══════════════════════════════
${fullText}
═══════════════════════════════`;
    }

    // Build system prompt
    const systemPrompt = `You are an expert literary editor and writing assistant specializing in ${docGenre} fiction. You are working directly with the author on their manuscript.

${bibleContext ? `STORY BIBLE:\n${bibleContext}\n\n` : ""}

${manuscriptContext ? `${manuscriptContext}\n\n` : ""}

YOUR CAPABILITIES:
- Answer questions about the manuscript (characters, plot, consistency)
- Suggest line edits and improvements to specific passages
- Proofread selected sections for grammar, style, and consistency
- Analyze pacing, tension, dialogue, and prose quality
- Identify plot holes, character inconsistencies, and timeline issues
- Suggest structural improvements

EDITING RULES:
- When suggesting edits, show the original text then your suggested revision
- Format edits clearly: ORIGINAL: "..." → SUGGESTED: "..."
- Never rewrite large sections unprompted — ask first
- Be specific and constructive
- Respect the author's voice — suggest, don't dictate
- For proofreading, list issues by category (grammar, consistency, style)

${mode === "selection" ? "You are reviewing a SPECIFIC SELECTED PASSAGE. Focus your analysis on this passage only unless asked otherwise." : ""}
${mode === "full" ? "You have access to the COMPLETE MANUSCRIPT. You can reference any part of it in your responses." : ""}`;

    // Build messages
    const messages: { role: "user" | "assistant"; content: string }[] = [
      ...sessionHistory.slice(-10), // last 10 messages for context
      { role: "user", content: userMessage },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    return NextResponse.json({ content: content.text });
  } catch (err) {
    console.error("Manuscript chat error:", err);
    return NextResponse.json(
      { error: "Failed to process request", detail: String(err) },
      { status: 500 }
    );
  }
}