import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
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

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
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

CRITICAL JSON RULES:
- Return ONLY a valid JSON object, no markdown, no backticks
- Every string value must be on a single line — NO newlines inside strings
- Use a space instead of a newline if you need to break text

Respond in this exact format:
{
  "issues": [
    {
      "type": "missing_word|repetition|awkward|punctuation|tense|pronoun|spacing",
      "severity": "error|warning|suggestion",
      "quote": "exact verbatim text on one line",
      "explanation": "what is wrong on one line",
      "suggestion": "corrected version on one line",
      "impact": "why this matters on one line"
    }
  ],
  "summary": "2 sentence assessment on one line",
  "score": 0-100,
  "strengths": ["one strength", "another"]
}

Limit to 15 issues. Return ONLY the JSON object, nothing else.`,
        messages: [
          {
            role: "user",
            content: `Proofread this chapter.\n\nChapter: ${chapterTitle ?? "Unknown"}\n\n${text}`,
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error("Anthropic API error:", anthropicRes.status, errText);
      return NextResponse.json(
        { error: `Anthropic API error: ${anthropicRes.status}` },
        { status: 502 },
      );
    }

    const data = await anthropicRes.json();
    const rawText = data.content?.[0]?.text ?? "{}";

    console.log("Raw response:", rawText.slice(0, 200));

    const stripped = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // Fix unescaped newlines inside JSON string values
    const sanitized = stripped.replace(
      /:\s*"([^"]*)"/g,
      (match: string, p1: string) => {
        const cleaned = p1
          .replace(/\n/g, " ")
          .replace(/\r/g, "")
          .replace(/\t/g, " ");
        return `: "${cleaned}"`;
      },
    );

    const jsonMatch = sanitized.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : sanitized;

    try {
      const result = JSON.parse(jsonStr);
      return NextResponse.json(result);
    } catch (parseErr) {
      console.error(
        "JSON parse error:",
        parseErr,
        "Raw:",
        rawText.slice(0, 300),
      );
      return NextResponse.json(
        { error: "Failed to parse AI response" },
        { status: 500 },
      );
    }
  } catch (err) {
    console.error("Grammar check error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
