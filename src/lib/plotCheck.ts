/** Shared (client + server) types for the AI plot & continuity checker. */

export type PassKey = "plot" | "continuity" | "character";

export const PASSES: { key: PassKey; label: string; description: string }[] = [
  { key: "plot", label: "Plot", description: "Plot holes, cause and effect, motivation, setups and payoffs" },
  { key: "continuity", label: "Continuity & timeline", description: "Details that change, who knows what, the order of events" },
  { key: "character", label: "Characters & world", description: "Consistent characters, relationships, world rules, Story Bible" },
];

export type IssueCategory =
  | "plot_hole" | "logic" | "motivation" | "setup_payoff"
  | "continuity" | "timeline"
  | "character" | "relationship" | "world_rules" | "story_bible";

export const CATEGORY_LABELS: Record<IssueCategory, string> = {
  plot_hole: "Plot hole",
  logic: "Cause & effect",
  motivation: "Motivation",
  setup_payoff: "Setup & payoff",
  continuity: "Continuity",
  timeline: "Timeline",
  character: "Character",
  relationship: "Relationship",
  world_rules: "World rules",
  story_bible: "Story Bible",
};

export type Severity = "high" | "medium" | "low";

export interface PlotEvidence {
  /** null for a Story Bible entry or an unknown chapter. */
  chapterId: string | null;
  chapterTitle: string;
  quote: string;
}

export interface PlotIssue {
  id: string;
  pass: PassKey;
  category: IssueCategory;
  severity: Severity;
  confidence: Severity;
  title: string;
  explanation: string;
  evidence: PlotEvidence[];
  suggestion: string;
}

export interface PlotThread {
  name: string;
  status: "resolved" | "open" | "abandoned";
  introducedIn: string;
  resolvedIn: string | null;
  note: string;
}

export interface PassResult {
  summary: string;
  issues: PlotIssue[];
  threads: PlotThread[];
}

export interface PassProgress {
  state: "queued" | "running" | "done" | "failed";
  /** While running: "reading" until the first output, then "analyzing". */
  phase?: "reading" | "analyzing";
  error?: string;
}

export type IssueState = "fixed" | "dismissed";

export interface PlotCheck {
  id: string;
  scope: "book" | "chapter";
  chapterId: string | null;
  status: "running" | "done" | "failed";
  progress: { passes?: Partial<Record<PassKey, PassProgress>> };
  result: { passes: Partial<Record<PassKey, PassResult>> } | null;
  issueStates: Record<string, IssueState>;
  error: string | null;
  wordCount: number;
  createdAt: string;
  finishedAt: string | null;
}

export const PLOT_CHECK_COLUMNS =
  "id, scope, chapter_id, status, progress, result, issue_states, error, word_count, created_at, finished_at";

export interface PlotCheckRow {
  id: string;
  scope: "book" | "chapter";
  chapter_id: string | null;
  status: "running" | "done" | "failed";
  progress: PlotCheck["progress"] | null;
  result: PlotCheck["result"];
  issue_states: Record<string, IssueState> | null;
  error: string | null;
  word_count: number;
  created_at: string;
  finished_at: string | null;
}

export const fromPlotCheckRow = (r: PlotCheckRow): PlotCheck => ({
  id: r.id,
  scope: r.scope,
  chapterId: r.chapter_id,
  status: r.status,
  progress: r.progress ?? {},
  result: r.result,
  issueStates: r.issue_states ?? {},
  error: r.error,
  wordCount: r.word_count,
  createdAt: r.created_at,
  finishedAt: r.finished_at,
});

/**
 * A check still "running" after this long was cut off by the server's time
 * limit (the route allows 5 minutes); report it as failed.
 */
export const STALE_RUNNING_MS = 8 * 60 * 1000;
