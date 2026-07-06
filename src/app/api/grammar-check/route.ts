import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { text, genre, chapterTitle, categories } = await req.json();

  if (!text)
    return NextResponse.json({ error: "No text provided" }, { status: 400 });

  const categoryInstructions: Record<string, string> = {
    missing_word:
      "MISSING WORDS — sentences where a word has been accidentally dropped",
    repetition:
      "WORD REPETITION — the same content word used 2+ times within 3 sentences",
    awkward:
      "AWKWARD PHRASING — sentences that sound unnatural or unclear when read aloud",
    punctuation:
      "PUNCTUATION — missing commas, dialogue missing closing punctuation",
    tense:
      "TENSE INCONSISTENCY — unintentional switches between past and present tense",
    pronoun:
      "UNCLEAR PRONOUNS — he/she/it/they that could refer to more than one person",
    spacing: "SPACING — double spaces, missing spaces after punctuation",
  };

  const selectedInstructions = (
    (categories as string[]) ?? Object.keys(categoryInstructions)
  )
    .map((id: string) => categoryInstructions[id])
    .filter(Boolean)
    .map((inst: string, i: number) => `${i + 1}. ${inst}`)
    .join("\n");

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: `You are an expert literary proofreader working on ${genre ?? "fiction"}.

Check ONLY for these specific issues:
${selectedInstructions}

For each issue include the EXACT verbatim text from the chapter (10-20 words max).

Respond with ONLY valid JSON:
{
  "issues": [
    {
      "type": "missing_word|repetition|awkward|punctuation|tense|pronoun|spacing",
      "severity": "error|warning|suggestion",
      "quote": "exact verbatim text",
      "explanation": "what is wrong",
      "suggestion": "corrected version",
      "impact": "why this matters"
    }
  ],
  "summary": "2 sentence assessment",
  "score": 0-100,
  "strengths": ["one strength", "another"]
}

Limit to 15 issues. Return ONLY the JSON object.`,
      messages: [
        {
          role: "user",
          content: `Proofread this chapter.\n\nChapter: ${chapterTitle ?? "Unknown"}\n\n${text}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "AI service error" }, { status: 502 });
  }

  const data = await response.json();
  const rawText = data.content?.[0]?.text ?? "{}";
  const stripped = rawText
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  const jsonMatch = stripped.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : stripped;

  try {
    return NextResponse.json(JSON.parse(jsonStr));
  } catch {
    return NextResponse.json(
      { error: "Failed to parse response" },
      { status: 500 },
    );
  }
}
