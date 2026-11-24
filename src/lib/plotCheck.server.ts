import Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildChapterTree, flattenChapterTree, type Chapter } from "@/lib/chapters";
import { htmlToText } from "@/lib/versionDiff";
import { QUESTIONNAIRE, normalizeAnswers } from "@/lib/characterQuestionnaire";
import {
  PASSES,
  type IssueCategory, type PassKey, type PassProgress, type PassResult,
  type PlotEvidence, type PlotIssue, type PlotThread, type Severity,
} from "@/lib/plotCheck";
import { outlineText } from "@/lib/outlineDocs";

export const PLOT_CHECK_MODEL = "claude-opus-5-5";

/** Leave room in the 1M-token context for instructions and the model's work. */
const MAX_INPUT_TOKENS = 850_000;

// ── Building the input ────────────────────────────────

type Row = Record<string, unknown>;

interface Manuscript {
  title: string;
  genre: string | null;
  /** Reading order; `number` is what the model cites (0 = Story Bible). */
  chapters: { number: number; id: string; title: string; partOf: string | null; text: string }[];
  storyBible: string;
  wordCount: number;
}

const SKIP_FIELDS = new Set([
  "id", "bible_id", "user_id", "document_id", "chapter_id", "created_at", "updated_at",
  "images", "image_url", "color", "order_index", "questionnaire",
]);

const label = (key: string) =>
  key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

/** Every filled-in field of a Story Bible row, one per line. */
function describeRow(row: Row, titleKey: string): string {
  const lines = [`## ${String(row[titleKey] ?? "Untitled")}`];
  for (const [key, value] of Object.entries(row)) {
    if (key === titleKey || SKIP_FIELDS.has(key) || value == null) continue;
    const text = Array.isArray(value) ? value.join(", ") : typeof value === "object" ? "" : String(value);
    if (text.trim()) lines.push(`${label(key)}: ${text.trim()}`);
  }
  const answers = normalizeAnswers(row.questionnaire).answers;
  const qa = QUESTIONNAIRE.flatMap((p) => p.items)
    .filter((q) => answers[q.id]?.trim())
    .map((q) => `- ${q.text} ${answers[q.id].trim()}`);
  if (qa.length) lines.push("Questionnaire answers:", ...qa);
  return lines.join("\n");
}

export async function loadManuscript(supabase: SupabaseClient, documentId: string): Promise<Manuscript> {
  const [{ data: doc, error: docError }, { data: chapterRows, error: chError }, { data: bible }, { data: outlineDocs }] = await Promise.all([
    supabase.from("documents").select("title, genre").eq("id", documentId).single(),
    supabase.from("chapters").select("id, document_id, parent_id, title, content, synopsis, guidance, order_index").eq("document_id", documentId),
    supabase.from("story_bibles").select("id").eq("document_id", documentId).maybeSingle(),
    supabase.from("outline_documents").select("title, content").eq("document_id", documentId).order("created_at"),
  ]);
  if (docError || !doc) throw new Error(docError?.message ?? "Book not found");
  if (chError) throw new Error(chError.message);

  const ordered = flattenChapterTree(buildChapterTree((chapterRows ?? []) as Chapter[]));
  const titles = new Map(ordered.map((c) => [c.id, c.title]));
  const chapters = ordered.map((c, i) => ({
    number: i + 1,
    id: c.id,
    title: c.title || "Untitled",
    partOf: c.parent_id ? titles.get(c.parent_id) || "Untitled" : null,
    text: htmlToText(c.content),
  }));

  const sections: string[] = [];
  if (bible) {
    const [chars, world, outline, timeline] = await Promise.all([
      supabase.from("characters").select("*").eq("bible_id", bible.id),
      supabase.from("world_entries").select("*").eq("bible_id", bible.id),
      supabase.from("outline_sections").select("*").eq("bible_id", bible.id).order("order_index"),
      supabase.from("timeline_events").select("*").eq("bible_id", bible.id).order("order_index"),
    ]);
    const add = (heading: string, rows: Row[] | null, titleKey: string) => {
      if (rows?.length) sections.push(`# ${heading}\n\n${rows.map((r) => describeRow(r, titleKey)).join("\n\n")}`);
    };
    add("Characters", chars.data as Row[] | null, "name");
    add("World", world.data as Row[] | null, "title");
    add("Outline", outline.data as Row[] | null, "title");
    add("Timeline", timeline.data as Row[] | null, "title");
  }
  // Outlines the author uploaded from Word, as written.
  for (const o of (outlineDocs ?? []) as { title: string | null; content: string | null }[]) {
    const text = outlineText(o.content ?? "");
    if (text) sections.push(`# Outline document: ${o.title || "Outline"}\n\n${text}`);
  }

  return {
    title: doc.title || "Untitled",
    genre: doc.genre ?? null,
    chapters,
    storyBible: sections.join("\n\n"),
    wordCount: chapters.reduce((n, c) => n + c.text.split(/\s+/).filter(Boolean).length, 0),
  };
}

const attr = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function manuscriptBlock(m: Manuscript): string {
  const bible = m.storyBible || "(The author hasn't filled in a Story Bible for this book.)";
  const chapters = m.chapters
    .map((c) => `<chapter number="${c.number}" title="${attr(c.title)}"${c.partOf ? ` part_of="${attr(c.partOf)}"` : ""}>\n${c.text || "(empty)"}\n</chapter>`)
    .join("\n\n");
  return `<story_bible>\n${bible}\n</story_bible>\n\n<manuscript title="${attr(m.title)}"${m.genre ? ` genre="${attr(m.genre)}"` : ""} chapters="${m.chapters.length}">\n${chapters}\n</manuscript>`;
}

// ── Prompts ───────────────────────────────────────────

const SYSTEM_PROMPT = `You are a developmental editor checking a fiction manuscript for plot and continuity problems: the kind a careful reader or editor would catch, such as contradictions, broken cause and effect, details that change between chapters, timeline errors, and characters or world rules behaving inconsistently.

The first part of the user message holds the book's Story Bible (the author's notes on characters, world, outline and timeline) and the manuscript, split into numbered chapters; a chapter with part_of is a scene within that chapter. The last part says which aspect of the book to check on this pass. Three passes run separately, and each problem should be reported by exactly one of them, the one it fits best:
- Plot: the story's logic. Plot holes, cause and effect, decisions that lack a believable reason given the story so far, setups and payoffs, and the list of plot threads.
- Continuity and timeline: any fact that changes between passages (a description, an object or where it is, an injury, who knows what) and the order and timing of events. A changed fact belongs here even when it also affects the plot or a character.
- Characters and world: behaviour, voice and relationships that contradict how a character was established, and world rules that don't hold.
Report only the problems that belong to this pass.

What counts as an issue:
- Something the text contradicts, or that a reader would reasonably find inconsistent or unexplained, given everything in the manuscript.
- A conflict between the manuscript and the Story Bible. The manuscript may have deliberately moved on from the notes, so say which version looks intended when that's clear.

What doesn't:
- Prose style, grammar, pacing and word choice.
- Mysteries, misdirection, unreliable narration and foreshadowing the story clearly intends, unless the text contradicts itself in a way a reader couldn't reconcile.
- Threads the outline shows being resolved in chapters that aren't written yet. The manuscript may be an unfinished draft: treat missing later chapters as unwritten rather than as dropped threads.

Evidence: cite the passages involved in every issue, usually two or more for a contradiction. Copy each quote exactly as it appears in the manuscript (same words, spelling and punctuation), one sentence or phrase of at most about 200 characters from a single paragraph, so the author can find it. Give the number of the chapter it comes from. For a conflict with the Story Bible, also cite the Story Bible entry, with chapter 0.

A short list of real problems is more useful than a long list of weak ones. Set confidence to "low" when an issue depends on a reading the text doesn't settle. Severity: "high" breaks the story's logic or most readers will notice it; "medium" is a noticeable inconsistency; "low" is a minor slip.

Write for the author: plain, specific and brief. Explanations and suggestions are 1 to 4 sentences each and refer to chapters by title, not number. The summary is 2 to 4 sentences on the overall state of this aspect of the book; the author doesn't see the passes, so don't mention them or problems that belong to another one.`;

const PASS_TASKS: Record<PassKey, string> = {
  plot: `This pass: PLOT. Look for plot holes (events that couldn't happen given what's been established, or that the story never accounts for), gaps in cause and effect, decisions a character makes without believable motivation given what they know and want, and setups that never pay off. Use the categories plot_hole, logic, motivation and setup_payoff.

Also list the book's significant plot threads (subplots, open questions, promises made to the reader) in threads, each with its status: resolved (paid off), open (still in play and may be resolved later) or abandoned (raised and then dropped). introduced_in and resolved_in are chapter numbers; resolved_in is null when the thread isn't resolved.`,
  continuity: `This pass: CONTINUITY AND TIMELINE. Track concrete facts across chapters: names and spellings, physical descriptions, injuries and how they heal, clothing and objects (who has what, and where it is), places and travel, weather and time of day, who knows what and when they learned it, ages, dates, durations, and the order of events. Report where these contradict each other or where the timeline doesn't work. Use the categories continuity and timeline. Return an empty threads list.`,
  character: `This pass: CHARACTERS AND WORLD. Check that characters act, speak and treat each other consistently with how they've been established (including their Story Bible profiles), that changes in relationships are earned on the page, and that the world's rules (magic, technology, society, geography) hold, including against the Story Bible. Use the categories character, relationship and world_rules, and story_bible for a conflict with the Story Bible that no other category describes. Return an empty threads list.`,
};

function focusNote(chapter: Manuscript["chapters"][number]): string {
  return `\n\nFocus on chapter ${chapter.number}, "${chapter.title}"${chapter.partOf ? ` (in "${chapter.partOf}")` : ""}: report only issues that involve a passage in that chapter. Compare it against any other chapter and the Story Bible. In threads, list only the threads that chapter introduces, advances or resolves.`;
}

const CATEGORIES: IssueCategory[] = [
  "plot_hole", "logic", "motivation", "setup_payoff", "continuity", "timeline",
  "character", "relationship", "world_rules", "story_bible",
];
const LEVELS: Severity[] = ["high", "medium", "low"];

/** One schema for every pass, so the cached prompt prefix is identical. */
const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "issues", "threads"],
  properties: {
    summary: { type: "string" },
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["category", "severity", "confidence", "title", "explanation", "evidence", "suggestion"],
        properties: {
          category: { type: "string", enum: CATEGORIES },
          severity: { type: "string", enum: LEVELS },
          confidence: { type: "string", enum: LEVELS },
          title: { type: "string" },
          explanation: { type: "string" },
          evidence: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["chapter", "quote"],
              properties: { chapter: { type: "integer" }, quote: { type: "string" } },
            },
          },
          suggestion: { type: "string" },
        },
      },
    },
    threads: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "status", "introduced_in", "resolved_in", "note"],
        properties: {
          name: { type: "string" },
          status: { type: "string", enum: ["resolved", "open", "abandoned"] },
          introduced_in: { type: "integer" },
          resolved_in: { anyOf: [{ type: "integer" }, { type: "null" }] },
          note: { type: "string" },
        },
      },
    },
  },
} as const;

interface RawOutput {
  summary: string;
  issues: {
    category: IssueCategory; severity: Severity; confidence: Severity; title: string;
    explanation: string; evidence: { chapter: number; quote: string }[]; suggestion: string;
  }[];
  threads: { name: string; status: PlotThread["status"]; introduced_in: number; resolved_in: number | null; note: string }[];
}

// ── Running a check ───────────────────────────────────

/** Rough token estimate (no tokenizer call) used only to refuse oversized books. */
const estimateTokens = (text: string) => Math.ceil(text.length / 3.5);

export class PlotCheckError extends Error {}

/** The Messages API request for one pass (fallback options are added by the caller). */
export function passRequest(key: PassKey, input: ReturnType<typeof prepareInput>) {
  return {
    model: PLOT_CHECK_MODEL,
    max_tokens: 64000,
    // Thinking is always on for this model; effort sets how hard it works.
    thinking: { type: "adaptive" as const },
    output_config: { effort: "high" as const, format: { type: "json_schema" as const, schema: OUTPUT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{
      role: "user" as const,
      content: [
        // The Story Bible + manuscript is identical across passes: cache it.
        { type: "text" as const, text: input.block, cache_control: { type: "ephemeral" as const } },
        { type: "text" as const, text: PASS_TASKS[key] + (input.focus ? focusNote(input.focus) : "") },
      ],
    }],
  };
}

/** Validate the input before a check row is created (no model call). */
export function prepareInput(m: Manuscript, focusChapterId: string | null) {
  if (!m.chapters.some((c) => c.text.trim())) throw new PlotCheckError("There's no text to check yet.");
  const focus = focusChapterId ? m.chapters.find((c) => c.id === focusChapterId) : null;
  if (focusChapterId && !focus) throw new PlotCheckError("That chapter couldn't be found.");
  if (focus && !focus.text.trim()) throw new PlotCheckError("This chapter has no text yet.");
  const block = manuscriptBlock(m);
  if (estimateTokens(SYSTEM_PROMPT + block) > MAX_INPUT_TOKENS) {
    throw new PlotCheckError(
      `This manuscript (about ${m.wordCount.toLocaleString()} words) is too long to check in one go. Try checking one chapter at a time.`,
    );
  }
  return { block, focus };
}

/**
 * Runs the three passes in parallel and saves progress and results to the
 * plot_checks row as they arrive. Never throws: failures are recorded.
 */
export async function runPlotCheck(
  supabase: SupabaseClient,
  checkId: string,
  m: Manuscript,
  input: ReturnType<typeof prepareInput>,
) {
  const client = new Anthropic();
  const progress: Partial<Record<PassKey, PassProgress>> = Object.fromEntries(
    PASSES.map((p) => [p.key, { state: "queued" } satisfies PassProgress]),
  );
  const results: Partial<Record<PassKey, PassResult>> = {};
  const byNumber = new Map(m.chapters.map((c) => [c.number, c]));

  // Single writer for this row: chain updates so they land in order.
  let writes = Promise.resolve();
  const save = (patch: Record<string, unknown>) => {
    writes = writes.then(async () => {
      const { error } = await supabase.from("plot_checks").update(patch).eq("id", checkId);
      if (error) console.error("plot check save failed:", error.message);
    });
    return writes;
  };
  const setPass = (key: PassKey, p: PassProgress) => {
    progress[key] = p;
    void save({ progress: { passes: progress } });
  };

  const toEvidence = (e: { chapter: number; quote: string }): PlotEvidence => {
    if (e.chapter === 0) return { chapterId: null, chapterTitle: "Story Bible", quote: e.quote };
    const ch = byNumber.get(e.chapter);
    return ch
      ? { chapterId: ch.id, chapterTitle: ch.partOf ? `${ch.partOf} › ${ch.title}` : ch.title, quote: e.quote }
      : { chapterId: null, chapterTitle: "Unknown chapter", quote: e.quote };
  };
  const chapterName = (n: number | null) => {
    const ch = n ? byNumber.get(n) : undefined;
    return ch ? (ch.partOf ? `${ch.partOf} › ${ch.title}` : ch.title) : null;
  };

  const runPass = async (key: PassKey, onStarted: () => void): Promise<void> => {
    setPass(key, { state: "running", phase: "reading" });
    try {
      const stream = client.beta.messages.stream({
        ...passRequest(key, input),
        // If a safety classifier declines, retry on Anthropic's recommended model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      });
      let started = false;
      stream.on("streamEvent", (event) => {
        if (!started && event.type === "message_start") { started = true; onStarted(); }
        if (event.type === "content_block_start" && progress[key]?.phase !== "analyzing") {
          setPass(key, { state: "running", phase: "analyzing" });
        }
      });
      const message = await stream.finalMessage();
      if (!started) onStarted();
      const u = message.usage;
      console.info(
        `plot check ${checkId} ${key}: ${u.input_tokens} input, ${u.cache_creation_input_tokens ?? 0} cache write, ` +
        `${u.cache_read_input_tokens ?? 0} cache read, ${u.output_tokens} output tokens (${message.stop_reason})`,
      );

      if (message.stop_reason === "refusal") throw new PlotCheckError("The AI declined to analyze this part of the book.");
      if (message.stop_reason === "max_tokens") throw new PlotCheckError("The analysis ran too long and was cut off.");
      const text = [...message.content].reverse().find((b) => b.type === "text");
      if (!text || text.type !== "text") throw new PlotCheckError("The AI returned no results.");
      const raw = JSON.parse(text.text) as RawOutput;

      results[key] = {
        summary: raw.summary,
        issues: raw.issues.map((issue, i): PlotIssue => ({
          id: `${key}-${i + 1}`,
          pass: key,
          category: issue.category,
          severity: issue.severity,
          confidence: issue.confidence,
          title: issue.title,
          explanation: issue.explanation,
          evidence: issue.evidence.map(toEvidence),
          suggestion: issue.suggestion,
        })),
        threads: raw.threads.map((t): PlotThread => ({
          name: t.name,
          status: t.status,
          introducedIn: chapterName(t.introduced_in) ?? "Unknown chapter",
          resolvedIn: chapterName(t.resolved_in),
          note: t.note,
        })),
      };
      progress[key] = { state: "done" };
      void save({ progress: { passes: progress }, result: { passes: results } });
    } catch (err) {
      onStarted();
      const message = err instanceof PlotCheckError
        ? err.message
        : err instanceof Anthropic.RateLimitError
          ? "The AI service is busy. Try again in a few minutes."
          : err instanceof Anthropic.APIError
            ? `The AI service returned an error (${err.status ?? "network"}).`
            : "Something went wrong while checking.";
      if (!(err instanceof PlotCheckError)) console.error(`plot check pass ${key} failed:`, err);
      setPass(key, { state: "failed", error: message });
    }
  };

  // Start the first pass, and the others once it has begun responding, so they
  // read the manuscript from the prompt cache instead of paying for it again.
  let release!: () => void;
  const firstStarted = new Promise<void>((resolve) => { release = resolve; });
  const [first, ...rest] = PASSES.map((p) => p.key);
  const runs = [runPass(first, release)];
  await firstStarted;
  runs.push(...rest.map((key) => runPass(key, () => {})));
  await Promise.all(runs);

  const failed = PASSES.filter((p) => progress[p.key]?.state === "failed");
  await save({
    status: failed.length === PASSES.length ? "failed" : "done",
    error: failed.length === PASSES.length ? progress[first]?.error ?? "The check failed." : null,
    finished_at: new Date().toISOString(),
  });
  await writes;
}

