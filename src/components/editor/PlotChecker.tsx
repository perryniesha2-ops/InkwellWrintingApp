"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle, AlertTriangle, BookOpen, Check, CheckCircle2, ChevronDown, ChevronRight,
  Info, Loader2, RotateCcw, Route, X,
} from "lucide-react";
import type { Chapter } from "@/lib/chapters";
import {
  CATEGORY_LABELS, PASSES,
  type IssueState, type PassKey, type PlotCheck, type PlotEvidence, type PlotIssue, type Severity,
} from "@/lib/plotCheck";

interface PlotCheckerProps {
  documentId: string;
  chapters: Chapter[];
  activeChapterId: string | null;
  /** Save unsaved edits first so the check reads the latest text. */
  flushSave: () => Promise<void>;
  /** Jump to a quoted passage; resolves to false if it can't be found. */
  onGoToQuote: (chapterId: string, quote: string) => Promise<boolean>;
  isOpen: boolean;
  onClose: () => void;
}

const font = { fontFamily: "var(--font-inter)" } as const;
const iconButton: React.CSSProperties = {
  color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "3px",
};
const SEVERITY_ORDER: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
const POLL_MS = 3000;

function SeverityIcon({ severity }: { severity: Severity }) {
  const style = { width: "13px", height: "13px", flexShrink: 0, marginTop: "2px" };
  if (severity === "high") return <AlertCircle style={{ ...style, color: "#ef4444" }} />;
  if (severity === "medium") return <AlertTriangle style={{ ...style, color: "#f59e0b" }} />;
  return <Info style={{ ...style, color: "#60a5fa" }} />;
}

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function Evidence({ evidence, onGoToQuote }: {
  evidence: PlotEvidence;
  onGoToQuote: PlotCheckerProps["onGoToQuote"];
}) {
  const [missing, setMissing] = useState(false);
  const clickable = !!evidence.chapterId;
  return (
    <div style={{ marginTop: "6px" }}>
      <button
        disabled={!clickable}
        onClick={async (e) => {
          e.stopPropagation();
          if (!evidence.chapterId) return;
          setMissing(!(await onGoToQuote(evidence.chapterId, evidence.quote)));
        }}
        title={clickable ? "Show this passage" : undefined}
        style={{ ...font, display: "block", width: "100%", textAlign: "left", background: "var(--bg-elevated)", border: "none", borderLeft: "2px solid var(--gold-border)", padding: "5px 8px", cursor: clickable ? "pointer" : "default" }}>
        <span style={{ display: "block", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: clickable ? "var(--gold-primary)" : "var(--text-dim)", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {evidence.chapterTitle}
        </span>
        <span style={{ fontSize: "12px", lineHeight: 1.5, fontStyle: "italic", color: "var(--text-secondary)", overflowWrap: "anywhere" }}>
          “{evidence.quote}”
        </span>
      </button>
      {missing && (
        <p style={{ ...font, margin: "3px 0 0", fontSize: "10.5px", color: "var(--text-dim)" }}>
          Couldn&apos;t find this passage. It may have been edited since the check.
        </p>
      )}
    </div>
  );
}

function IssueCard({ issue, state, onSetState, onGoToQuote }: {
  issue: PlotIssue;
  state: IssueState | undefined;
  onSetState: (state: IssueState | null) => void;
  onGoToQuote: PlotCheckerProps["onGoToQuote"];
}) {
  const [open, setOpen] = useState(false);
  const done = !!state;
  return (
    <div style={{ margin: "0 10px 8px", border: "1px solid var(--border-color)", background: "var(--bg-primary)", opacity: done ? 0.65 : 1 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{ ...font, display: "flex", gap: "8px", width: "100%", textAlign: "left", padding: "9px 10px", background: "none", border: "none", cursor: "pointer" }}>
        <SeverityIcon severity={issue.severity} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: "12.5px", fontWeight: 600, lineHeight: 1.4, color: "var(--text-primary)", textDecoration: state === "fixed" ? "line-through" : undefined }}>
            {issue.title}
          </span>
          <span style={{ display: "block", marginTop: "2px", fontSize: "10.5px", color: "var(--text-dim)" }}>
            {CATEGORY_LABELS[issue.category] ?? issue.category}
            {issue.confidence === "low" && " · possible issue"}
            {state === "fixed" && " · fixed"}
            {state === "dismissed" && " · dismissed"}
          </span>
        </span>
        {open
          ? <ChevronDown style={{ width: "13px", height: "13px", color: "var(--text-dim)", flexShrink: 0, marginTop: "2px" }} />
          : <ChevronRight style={{ width: "13px", height: "13px", color: "var(--text-dim)", flexShrink: 0, marginTop: "2px" }} />}
      </button>
      {open && (
        <div style={{ ...font, padding: "0 10px 10px 31px" }}>
          <p style={{ margin: 0, fontSize: "12.5px", lineHeight: 1.6, color: "var(--text-secondary)" }}>{issue.explanation}</p>
          {issue.evidence.map((e, i) => <Evidence key={i} evidence={e} onGoToQuote={onGoToQuote} />)}
          {issue.suggestion && (
            <p style={{ margin: "8px 0 0", fontSize: "12px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--gold-primary)", fontWeight: 600 }}>Suggestion: </strong>{issue.suggestion}
            </p>
          )}
          <div style={{ display: "flex", gap: "6px", marginTop: "10px" }}>
            {done ? (
              <button onClick={() => onSetState(null)} style={{ ...iconButton, ...font, fontSize: "11.5px", gap: "4px", color: "var(--text-muted)", border: "1px solid var(--border-color)", padding: "3px 8px" }}>
                <RotateCcw style={{ width: "11px", height: "11px" }} /> Reopen
              </button>
            ) : (
              <>
                <button onClick={() => onSetState("fixed")} style={{ ...iconButton, ...font, fontSize: "11.5px", gap: "4px", color: "var(--gold-primary)", border: "1px solid var(--gold-border)", padding: "3px 8px" }}>
                  <Check style={{ width: "11px", height: "11px" }} /> Mark fixed
                </button>
                <button onClick={() => onSetState("dismissed")} style={{ ...iconButton, ...font, fontSize: "11.5px", color: "var(--text-muted)", border: "1px solid var(--border-color)", padding: "3px 8px" }}>
                  Not an issue
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlotChecker({
  documentId, chapters, activeChapterId, flushSave, onGoToQuote, isOpen, onClose,
}: PlotCheckerProps) {
  const [check, setCheck] = useState<PlotCheck | null | undefined>(undefined);
  const [scope, setScope] = useState<"book" | "chapter">("book");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [severity, setSeverity] = useState<Severity | "all">("all");
  const [showDone, setShowDone] = useState(false);
  const [threadsOpen, setThreadsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/plot-check`);
    if (res.ok) setCheck((await res.json()) as PlotCheck | null);
  }, [documentId]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch(`/api/documents/${documentId}/plot-check`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PlotCheck | null) => { if (!cancelled) setCheck(data); })
      .catch(() => { if (!cancelled) setCheck(null); });
    return () => { cancelled = true; };
  }, [isOpen, documentId]);

  // Poll while a check runs (and the panel is open).
  const running = check?.status === "running";
  useEffect(() => {
    if (!isOpen || !running) return;
    const poll = setInterval(() => void load(), POLL_MS);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, [isOpen, running, load]);

  const start = async () => {
    setStarting(true);
    setError(null);
    try {
      await flushSave();
      const res = await fetch(`/api/documents/${documentId}/plot-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope, chapterId: scope === "chapter" ? activeChapterId : undefined }),
      });
      const body = (await res.json().catch(() => ({}))) as PlotCheck & { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Couldn't start the check.");
        if (res.status === 409) void load();
        return;
      }
      setCheck(body);
      setNow(Date.now());
      setShowDone(false);
    } catch {
      setError("Couldn't start the check. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  };

  const setIssueState = async (issueId: string, state: IssueState | null) => {
    if (!check) return;
    const previous = check.issueStates;
    const next = { ...previous };
    if (state) next[issueId] = state; else delete next[issueId];
    setCheck({ ...check, issueStates: next });
    const res = await fetch(`/api/documents/${documentId}/plot-check/${check.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ issueId, state }),
    });
    if (!res.ok) setCheck((c) => (c ? { ...c, issueStates: previous } : c));
  };

  const issues = useMemo(() => {
    const all = PASSES.flatMap((p) => check?.result?.passes[p.key]?.issues ?? []);
    return all.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [check]);
  const threads = useMemo(
    () => PASSES.flatMap((p) => check?.result?.passes[p.key]?.threads ?? []),
    [check],
  );
  const openIssues = issues.filter((i) => !check?.issueStates[i.id]);
  const doneCount = issues.length - openIssues.length;
  const visible = (showDone ? issues : openIssues).filter((i) => severity === "all" || i.severity === severity);
  const counts = { high: 0, medium: 0, low: 0 } as Record<Severity, number>;
  openIssues.forEach((i) => { counts[i.severity] += 1; });

  const activeChapter = chapters.find((c) => c.id === activeChapterId);
  const focusChapter = check?.chapterId ? chapters.find((c) => c.id === check.chapterId) : null;
  const elapsed = check ? Math.max(0, Math.round((now - new Date(check.createdAt).getTime()) / 1000)) : 0;
  const failedPasses = PASSES.filter((p) => check?.progress.passes?.[p.key]?.state === "failed");

  const passState = (key: PassKey) => check?.progress.passes?.[key];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "fixed", right: 0, top: "48px", bottom: 0, width: "320px",
            display: "flex", flexDirection: "column", zIndex: 40,
            background: "var(--bg-surface)", borderLeft: "1px solid var(--border-color)",
          }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px", height: "48px", flexShrink: 0, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Route style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Plot &amp; Continuity</span>
            </div>
            <button onClick={onClose} style={iconButton} title="Close"><X style={{ width: "14px", height: "14px" }} /></button>
          </div>

          {/* Run a check */}
          <div style={{ ...font, padding: "12px 16px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
            <div role="radiogroup" aria-label="What to check" style={{ display: "flex", border: "1px solid var(--border-color)", marginBottom: "8px" }}>
              {([["book", "Whole book"], ["chapter", "This chapter"]] as const).map(([key, text]) => (
                <button key={key} role="radio" aria-checked={scope === key}
                  disabled={key === "chapter" && !activeChapter}
                  onClick={() => setScope(key)}
                  style={{ ...font, flex: 1, padding: "5px 8px", fontSize: "12px", border: "none", cursor: "pointer", background: scope === key ? "var(--gold-subtle)" : "transparent", color: scope === key ? "var(--gold-primary)" : "var(--text-muted)" }}>
                  {text}
                </button>
              ))}
            </div>
            <p style={{ margin: "0 0 10px", fontSize: "11.5px", lineHeight: 1.55, color: "var(--text-dim)" }}>
              {scope === "book"
                ? "Reads every chapter and your Story Bible, checking plot, continuity and timeline, and characters and world."
                : `Checks “${activeChapter?.title || "this chapter"}” against the rest of the book and your Story Bible.`}
            </p>
            <button onClick={() => void start()} disabled={starting || running} className="btn-gold"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "7px 12px", fontSize: "12.5px", cursor: starting || running ? "default" : "pointer", opacity: running ? 0.6 : 1 }}>
              {starting ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <Route style={{ width: "13px", height: "13px" }} />}
              {running ? "Check in progress…" : check ? "Run a new check" : "Run check"}
            </button>
            {error && <p style={{ margin: "8px 0 0", fontSize: "11.5px", color: "#ef4444" }}>{error}</p>}
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {check === undefined ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
                <Loader2 className="animate-spin" style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
              </div>
            ) : check === null ? (
              <div style={{ ...font, padding: "8px 16px", fontSize: "12px", lineHeight: 1.65, color: "var(--text-dim)" }}>
                <p style={{ margin: "0 0 8px" }}>
                  The AI reads your manuscript like a careful editor and flags plot holes, details that change
                  between chapters, timeline problems, and characters or world rules that don&apos;t hold.
                </p>
                <p style={{ margin: 0 }}>A whole-book check takes a few minutes. You can keep writing while it runs.</p>
              </div>
            ) : running ? (
              <div style={{ ...font, padding: "8px 16px" }}>
                <p style={{ margin: "0 0 12px", fontSize: "12px", lineHeight: 1.6, color: "var(--text-muted)" }}>
                  Reading {check.scope === "book" ? `all ${check.wordCount.toLocaleString()} words` : `“${focusChapter?.title ?? "this chapter"}” in context`}…{" "}
                  <span style={{ color: "var(--text-dim)" }}>{Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}</span>
                </p>
                {PASSES.map((p) => {
                  const s = passState(p.key);
                  return (
                    <div key={p.key} style={{ display: "flex", gap: "10px", alignItems: "flex-start", marginBottom: "10px" }}>
                      <span style={{ marginTop: "1px", display: "flex" }}>
                        {s?.state === "done" ? <CheckCircle2 style={{ width: "14px", height: "14px", color: "#22c55e" }} />
                          : s?.state === "failed" ? <AlertCircle style={{ width: "14px", height: "14px", color: "#ef4444" }} />
                          : s?.state === "running" ? <Loader2 className="animate-spin" style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
                          : <span style={{ width: "14px", height: "14px", border: "1px solid var(--border-color)", borderRadius: "50%" }} />}
                      </span>
                      <span>
                        <span style={{ display: "block", fontSize: "12.5px", color: "var(--text-primary)" }}>{p.label}</span>
                        <span style={{ display: "block", fontSize: "11px", color: s?.state === "failed" ? "#ef4444" : "var(--text-dim)" }}>
                          {s?.state === "failed" ? s.error
                            : s?.state === "done" ? "Done"
                            : s?.phase === "analyzing" ? "Analyzing…"
                            : s?.state === "running" ? "Reading…" : p.description}
                        </span>
                      </span>
                    </div>
                  );
                })}
                <p style={{ margin: "6px 0 0", fontSize: "11px", lineHeight: 1.55, color: "var(--text-dim)" }}>
                  This usually takes a few minutes. You can keep writing or close this panel; the results are saved.
                </p>
              </div>
            ) : check.status === "failed" && !check.result ? (
              <div style={{ ...font, padding: "8px 16px", fontSize: "12px", lineHeight: 1.6, color: "#ef4444" }}>
                {check.error ?? "The check failed."}
              </div>
            ) : (
              <>
                <div style={{ ...font, padding: "0 16px 8px" }}>
                  <p style={{ margin: "0 0 8px", fontSize: "11px", color: "var(--text-dim)" }}>
                    {check.scope === "book" ? "Whole book" : `“${focusChapter?.title ?? "Deleted chapter"}”`} · checked {timeAgo(check.createdAt)}
                  </p>
                  {failedPasses.length > 0 && (
                    <p style={{ margin: "0 0 8px", fontSize: "11.5px", lineHeight: 1.5, color: "#f59e0b" }}>
                      {failedPasses.map((p) => p.label).join(" and ")} couldn&apos;t be checked: {check.progress.passes?.[failedPasses[0].key]?.error}
                    </p>
                  )}
                  {/* Summaries */}
                  {PASSES.map((p) => {
                    const summary = check.result?.passes[p.key]?.summary;
                    return summary ? (
                      <p key={p.key} style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
                        <strong style={{ color: "var(--text-primary)", fontWeight: 600 }}>{p.label}. </strong>{summary}
                      </p>
                    ) : null;
                  })}
                </div>

                {/* Filters */}
                <div style={{ ...font, display: "flex", flexWrap: "wrap", gap: "4px", padding: "4px 16px 10px" }}>
                  {(["all", "high", "medium", "low"] as const).map((key) => (
                    <button key={key} onClick={() => setSeverity(key)}
                      style={{ ...font, padding: "3px 8px", fontSize: "11px", cursor: "pointer", border: "1px solid var(--border-color)", background: severity === key ? "var(--bg-elevated)" : "transparent", color: severity === key ? "var(--text-primary)" : "var(--text-muted)" }}>
                      {key === "all" ? `All (${openIssues.length})` : `${key[0].toUpperCase()}${key.slice(1)} (${counts[key]})`}
                    </button>
                  ))}
                </div>

                {visible.length === 0 ? (
                  <p style={{ ...font, margin: 0, padding: "4px 16px 12px", fontSize: "12px", color: "var(--text-dim)" }}>
                    {issues.length === 0 ? "No issues found." : "Nothing left here."}
                  </p>
                ) : (
                  visible.map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      state={check.issueStates[issue.id]}
                      onSetState={(state) => void setIssueState(issue.id, state)}
                      onGoToQuote={onGoToQuote}
                    />
                  ))
                )}
                {doneCount > 0 && (
                  <button onClick={() => setShowDone((s) => !s)}
                    style={{ ...font, display: "block", margin: "0 16px 12px", padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: "11.5px", color: "var(--text-muted)" }}>
                    {showDone ? "Hide" : "Show"} {doneCount} fixed or dismissed
                  </button>
                )}

                {/* Plot threads */}
                {threads.length > 0 && (
                  <div style={{ ...font, borderTop: "1px solid var(--border-color)", marginTop: "4px" }}>
                    <button onClick={() => setThreadsOpen((o) => !o)} aria-expanded={threadsOpen}
                      style={{ ...font, display: "flex", alignItems: "center", gap: "6px", width: "100%", padding: "10px 16px", background: "none", border: "none", cursor: "pointer", fontSize: "11px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
                      <BookOpen style={{ width: "12px", height: "12px" }} />
                      Plot threads ({threads.length})
                      <span style={{ marginLeft: "auto", display: "flex" }}>
                        {threadsOpen ? <ChevronDown style={{ width: "13px", height: "13px" }} /> : <ChevronRight style={{ width: "13px", height: "13px" }} />}
                      </span>
                    </button>
                    {threadsOpen && threads.map((t, i) => (
                      <div key={i} style={{ padding: "0 16px 10px" }}>
                        <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
                          <span style={{ flex: 1, minWidth: 0, fontSize: "12.5px", fontWeight: 600, color: "var(--text-primary)" }}>{t.name}</span>
                          <span style={{ fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0, color: t.status === "resolved" ? "#22c55e" : t.status === "abandoned" ? "#ef4444" : "var(--gold-primary)" }}>
                            {t.status}
                          </span>
                        </div>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--text-dim)" }}>
                          {t.introducedIn}{t.resolvedIn ? ` → ${t.resolvedIn}` : ""}
                        </p>
                        {t.note && <p style={{ margin: "3px 0 0", fontSize: "12px", lineHeight: 1.55, color: "var(--text-secondary)" }}>{t.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
