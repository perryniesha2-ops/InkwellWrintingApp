import Anthropic from "@anthropic-ai/sdk";
import { PROOF_CATEGORIES, type ProofParagraph, type RawSuggestion } from "@/lib/proofread";

export const PROOFREAD_MODEL = "claude-opus-5-5";

/** The client sends a chapter in sections of about this size, in parallel. */
export const MAX_SECTION_CHARS = 12_000;

const SYSTEM_PROMPT = `You are a meticulous proofreader for fiction. You correct mechanical errors only: grammar, spelling and typos, punctuation, spacing, missing words and accidentally repeated words. You don't edit for style.

The user message gives a section of a chapter as numbered paragraphs, one per line: [n] followed by the paragraph's text exactly as written. Find every error in it.

For each error, return a suggestion:
- paragraph: the number of the paragraph it's in.
- original: the text containing the error, copied character for character from that paragraph (including spaces, quotation marks and punctuation), with enough words around it to be unique within the paragraph. Usually 2 to 8 words.
- replacement: that same text with only the error fixed. Change nothing else.
- category: grammar (subject-verb agreement, a wrong tense within a sentence, wrong word form, a wrong word such as their/there or loose/lose), spelling (typos and misspellings), punctuation (missing, extra or wrong punctuation, including unclosed quotation marks), spacing (double spaces, a missing space after punctuation, a space before punctuation), missing_word, or repeated_word ("the the").
- explanation: one short sentence for the author.

Leave these alone:
- The author's voice and style: word choice, sentence fragments and run-ons used for effect, sentences starting with "And" or "But", deliberate repetition.
- Dialogue and close narration written the way people speak ("gonna", "ain't", dropped letters, nonstandard grammar).
- Invented names and words, and the text's regional spelling (British or American), as long as it's consistent.
- The style of quotation marks (curly or straight) and dashes.
- Anything you're not confident is an error.

Report each error once; when a sentence has several errors close together, one suggestion may fix them together. Return an empty list when there are no errors.`;

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["suggestions"],
  properties: {
    suggestions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["paragraph", "original", "replacement", "category", "explanation"],
        properties: {
          paragraph: { type: "integer" },
          original: { type: "string" },
          replacement: { type: "string" },
          category: { type: "string", enum: PROOF_CATEGORIES.map((c) => c.key) },
          explanation: { type: "string" },
        },
      },
    },
  },
} as const;

export class ProofreadError extends Error {}

/** The Messages API request for one section (fallback options are added by the caller). */
export function proofreadRequest(paragraphs: ProofParagraph[], chapterTitle: string, genre: string | null) {
  const header = `Chapter: ${chapterTitle || "Untitled"}${genre ? `\nGenre: ${genre}` : ""}`;
  const body = paragraphs.map((p) => `[${p.n}] ${p.text}`).join("\n");
  return {
    model: PROOFREAD_MODEL,
    max_tokens: 64000,
    // Thinking is always on for this model; effort sets how carefully it reads.
    thinking: { type: "adaptive" as const },
    output_config: { effort: "high" as const, format: { type: "json_schema" as const, schema: OUTPUT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user" as const, content: `${header}\n\n${body}` }],
  };
}

/** Proofread one section of a chapter. */
export async function proofreadSection(
  paragraphs: ProofParagraph[],
  chapterTitle: string,
  genre: string | null,
): Promise<RawSuggestion[]> {
  const client = new Anthropic();
  const stream = client.beta.messages.stream({
    ...proofreadRequest(paragraphs, chapterTitle, genre),
    // If a safety classifier declines, retry on Anthropic's recommended model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  });
  const message = await stream.finalMessage();
  const u = message.usage;
  console.info(
    `proofread ${paragraphs.length} paragraphs: ${u.input_tokens} input, ${u.output_tokens} output tokens (${message.stop_reason})`,
  );
  if (message.stop_reason === "refusal") throw new ProofreadError("The AI declined to proofread this section.");
  if (message.stop_reason === "max_tokens") throw new ProofreadError("This section was too long to finish.");
  const text = [...message.content].reverse().find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new ProofreadError("The AI returned no results.");

  const numbers = new Set(paragraphs.map((p) => p.n));
  const { suggestions } = JSON.parse(text.text) as { suggestions: RawSuggestion[] };
  return suggestions.filter((s) => numbers.has(s.paragraph) && s.original && s.original !== s.replacement);
}
