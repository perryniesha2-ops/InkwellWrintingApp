"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookCheck, X, Loader2, CheckCircle2, AlertCircle,
  AlertTriangle, Info, ChevronDown, ChevronUp, MapPin,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

interface ProofreadIssue {
  type: "missing_word" | "run_on" | "choppy" | "awkward" | "repetition" | "pronoun" | "tense" | "punctuation" | "spacing";
  severity: "error" | "warning" | "suggestion";
  quote: string;
  explanation: string;
  suggestion: string;
  impact: string;
}

interface ProofreadResult {
  issues: ProofreadIssue[];
  summary: string;
  score: number;
  strengths: string[];
}

interface GrammarCheckerProps {
  content: string;
  genre?: string;
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  missing_word: { label: "Missing Word",    color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
  run_on:       { label: "Run-on",          color: "#f97316", bg: "rgba(249,115,22,0.1)" },
  choppy:       { label: "Choppy",          color: "#eab308", bg: "rgba(234,179,8,0.1)" },
  awkward:      { label: "Awkward",         color: "#8b5cf6", bg: "rgba(139,92,246,0.1)" },
  repetition:   { label: "Repetition",      color: "#d97706", bg: "rgba(217,119,6,0.1)" },
  pronoun:      { label: "Unclear Pronoun", color: "#06b6d4", bg: "rgba(6,182,212,0.1)" },
  tense:        { label: "Tense",           color: "#ec4899", bg: "rgba(236,72,153,0.1)" },
  punctuation:  { label: "Punctuation",     color: "#6b7280", bg: "rgba(107,114,128,0.1)" },
  spacing:      { label: "Spacing",         color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
};

const SCAN_CATEGORIES = [
  { id: "missing_word", label: "Missing Words",        icon: "🔍", description: "Words accidentally dropped from sentences" },
  { id: "repetition",   label: "Word Repetition",      icon: "🔄", description: "Same word used multiple times close together" },
  { id: "awkward",      label: "Awkward Phrasing",     icon: "✏️", description: "Sentences that sound unnatural or unclear" },
  { id: "punctuation",  label: "Punctuation",          icon: "，", description: "Missing or incorrect punctuation marks" },
  { id: "tense",        label: "Tense Consistency",    icon: "⏱️", description: "Unintentional switches between past and present" },
  { id: "pronoun",      label: "Unclear Pronouns",     icon: "👤", description: "He/she/they that could refer to multiple people" },
  { id: "spacing",      label: "Spacing & Formatting", icon: "⎵",  description: "Double spaces, spacing around punctuation" },
] as const;

type CategoryId = typeof SCAN_CATEGORIES[number]["id"];

// ── Helpers ────────────────────────────────────────────

function splitIntoChunks(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    if (remaining.length <= maxChars) { chunks.push(remaining); break; }
    let breakPoint = maxChars;
    const sentenceEnd = remaining.lastIndexOf(". ", maxChars);
    const questionEnd = remaining.lastIndexOf("? ", maxChars);
    const exclamEnd   = remaining.lastIndexOf("! ", maxChars);
    const bestBreak   = Math.max(sentenceEnd, questionEnd, exclamEnd);
    if (bestBreak > maxChars * 0.6) breakPoint = bestBreak + 2;
    chunks.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }
  return chunks.filter(Boolean);
}

function getCurrentChapter(editor: Editor | null, content: string): { text: string; title: string } {
  const chapters: { title: string; pos: number }[] = [];
  if (editor && !editor.isDestroyed) {
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading" && node.attrs.level === 1) {
        chapters.push({ title: node.textContent, pos });
      }
    });
  }

  if (chapters.length === 0) {
    const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { text: plain.slice(0, 6000), title: "Document" };
  }

  let currentChapterIndex = 0;
  if (editor && !editor.isDestroyed) {
    const cursorPos = editor.state.selection.from;
    for (let i = chapters.length - 1; i >= 0; i--) {
      if (cursorPos >= chapters[i].pos) { currentChapterIndex = i; break; }
    }
  }

  const currentChapter = chapters[currentChapterIndex];
  const div = document.createElement("div");
  div.innerHTML = content;
  const allHeadings = Array.from(div.querySelectorAll("h1"));
  const currentHeading = allHeadings[currentChapterIndex];
  const nextHeading = allHeadings[currentChapterIndex + 1];

  if (!currentHeading) {
    const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return { text: plain.slice(0, 6000), title: "Document" };
  }

  let chapterText = "";
  let node = currentHeading.nextSibling;
  while (node && node !== nextHeading) {
    const el = node as HTMLElement;
    const text = (el.textContent ?? el.nodeValue ?? "").trim();
    if (text) chapterText += text + " ";
    node = node.nextSibling;
  }

  return {
    text: chapterText.replace(/\s+/g, " ").trim().slice(0, 6000),
    title: currentChapter.title,
  };
}

function navigateToQuote(editor: Editor | null, quote: string) {
  if (!editor || !quote) return;

  const searchText = quote
    .replace(/^["'"']|["'"']$/g, "")
    .trim()
    .slice(0, 60);

  if (!searchText) return;

  let foundPos: number | null = null;
  let foundLength = 0;

  editor.state.doc.descendants((node, pos) => {
    if (foundPos !== null) return false;
    if (!node.isText || !node.text) return;
    const index = node.text.toLowerCase().indexOf(searchText.toLowerCase());
    if (index !== -1) {
      foundPos = pos + index;
      foundLength = searchText.length;
      return false;
    }
  });

  if (foundPos === null) return;

  try {
    editor.chain().focus().setTextSelection({ from: foundPos, to: foundPos + foundLength }).run();
  } catch { return; }

  setTimeout(() => {
    const container = document.getElementById("editor-scroll-container");
    if (!container) return;
    try {
      const { node } = editor.view.domAtPos(foundPos! + 1);
      const el = (node.nodeType === 1 ? node : (node as HTMLElement).parentElement) as HTMLElement | null;
      if (el) {
        const containerRect = container.getBoundingClientRect();
        const targetRect = el.getBoundingClientRect();
        const scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 120;
        container.scrollTo({ top: scrollTop, behavior: "smooth" });
      }
    } catch {
      try {
        const domPos = editor.view.domAtPos(foundPos! + 1);
        (domPos.node as HTMLElement)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      } catch { /* ignore */ }
    }
  }, 100);
}

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "error")   return <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
  if (severity === "warning") return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />;
  return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
}

function IssueCard({ issue, editor }: { issue: ProofreadIssue; editor: Editor | null }) {
  const [expanded, setExpanded] = useState(false);
  const config = TYPE_CONFIG[issue.type] ?? TYPE_CONFIG.punctuation;

  return (
    <div className="overflow-hidden mb-2" style={{ border: "1px solid var(--border-color)", background: "var(--bg-elevated)" }}>
      <div className="flex items-start gap-2 p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <SeverityIcon severity={issue.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, padding: "2px 6px", background: config.bg, color: config.color, letterSpacing: "0.04em" }}>
              {config.label}
            </span>
          </div>
          <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-primary)" }}>
            {issue.explanation}
          </p>
          {issue.quote && !expanded && (
            <p style={{ fontSize: "12px", fontFamily: "var(--font-cormorant)", fontStyle: "italic", marginTop: "2px", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              &quot;{issue.quote.slice(0, 60)}{issue.quote.length > 60 ? "…" : ""}&quot;
            </p>
          )}
        </div>
        {expanded
          ? <ChevronUp style={{ width: "13px", height: "13px", color: "var(--text-muted)", flexShrink: 0 }} />
          : <ChevronDown style={{ width: "13px", height: "13px", color: "var(--text-muted)", flexShrink: 0 }} />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} style={{ overflow: "hidden" }}>
            <div style={{ padding: "0 12px 12px", borderTop: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "8px" }}>
              {issue.quote && (
                <div style={{ paddingTop: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                    <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", margin: 0 }}>In your text</p>
                    <button
                      onClick={() => navigateToQuote(editor, issue.quote)}
                      style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "10px", fontFamily: "var(--font-inter)", padding: "2px 8px", background: "var(--gold-subtle)", color: "var(--gold-primary)", border: "none", cursor: "pointer" }}>
                      <MapPin style={{ width: "10px", height: "10px" }} />
                      Go to
                    </button>
                  </div>
                  <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "13px", fontStyle: "italic", padding: "8px 10px", background: "var(--bg-surface)", borderLeft: "2px solid var(--gold-primary)", color: "var(--text-primary)", margin: 0 }}>
                    &quot;{issue.quote}&quot;
                  </p>
                </div>
              )}
              {issue.suggestion && (
                <div>
                  <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "4px" }}>Suggestion</p>
                  <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "13px", fontStyle: "italic", padding: "8px 10px", background: "rgba(34,197,94,0.08)", borderLeft: "2px solid #22c55e", color: "var(--text-primary)", margin: 0 }}>
                    {issue.suggestion}
                  </p>
                </div>
              )}
              {issue.impact && (
                <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontStyle: "italic", color: "var(--text-muted)", margin: 0 }}>
                  💡 {issue.impact}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ScoreDisplay({ score, strengths }: { score: number; strengths: string[] }) {
  const color = score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444";
  const label = score >= 85 ? "Strong prose" : score >= 70 ? "Good with some issues" : "Needs attention";
  return (
    <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-color)", padding: "16px", marginBottom: "16px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px" }}>
        <div style={{ width: "56px", height: "56px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: `2px solid ${color}`, background: `${color}15` }}>
          <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "20px", color }}>{score}</span>
        </div>
        <div>
          <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", margin: "0 0 2px" }}>{label}</p>
          <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: 0 }}>Prose quality score</p>
        </div>
      </div>
      {strengths.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {strengths.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
              <span style={{ color: "#22c55e", fontSize: "12px", marginTop: "1px" }}>✓</span>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-primary)", margin: 0 }}>{s}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────

export default function GrammarChecker({ content, genre, editor, isOpen, onClose }: GrammarCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProofreadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "errors" | "warnings" | "suggestions">("all");
  const [currentChapterTitle, setCurrentChapterTitle] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [hasRun, setHasRun] = useState(false);
  const [mode, setMode] = useState<"chapter" | "selection">("chapter");
  const [selectionText, setSelectionText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<CategoryId>>(
    new Set(["missing_word", "repetition", "awkward", "punctuation", "tense"])
  );

  // Detect selected text
  useEffect(() => {
    if (!editor || !isOpen) return;
    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      if (from === to) { setSelectionText(""); return; }
      const text = editor.state.doc.textBetween(from, to, " ").trim();
      if (text.length > 50) {
        setSelectionText(text);
        setMode("selection");
      } else {
        setSelectionText("");
        setMode("chapter");
      }
    };
    editor.on("selectionUpdate", updateSelection);
    updateSelection();
    return () => { editor.off("selectionUpdate", updateSelection); };
  }, [editor, isOpen]);

  const toggleCategory = (id: CategoryId) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { if (next.size === 1) return prev; next.delete(id); }
      else next.add(id);
      return next;
    });
  };

  const runCheck = async () => {
    setLoading(true);
    setResult(null);
    setError(null);
    setProgress(0);
    setHasRun(true);

    let textToCheck: string;
    let titleToUse: string;

    if (mode === "selection" && selectionText) {
      textToCheck = selectionText;
      titleToUse = "Selected Text";
      setCurrentChapterTitle("Selected Text");
    } else {
      const { text: chapterText, title: chapterTitle } = getCurrentChapter(editor, content);
      textToCheck = chapterText;
      titleToUse = chapterTitle;
      setCurrentChapterTitle(chapterTitle);
    }

    try {
      const chunks = splitIntoChunks(textToCheck, 2500);
      const allIssues: ProofreadIssue[] = [];
      let totalScore = 0;
      let combinedSummary = "";
      const allStrengths: string[] = [];

      for (let i = 0; i < chunks.length; i++) {
        setProgress(Math.round((i / chunks.length) * 100));

        const response = await fetch("/api/grammar-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: chunks[i],
            genre,
            chapterTitle: chunks.length > 1
              ? `${titleToUse} (Part ${i + 1} of ${chunks.length})`
              : titleToUse,
            categories: Array.from(selectedCategories),
          }),
        });

        if (!response.ok) continue;
        const data = await response.json() as ProofreadResult;
        allIssues.push(...(data.issues ?? []));
        totalScore += data.score ?? 100;
        if (i === 0) combinedSummary = data.summary ?? "";
        allStrengths.push(...(data.strengths ?? []));
      }

      setProgress(100);
      setResult({
        issues: allIssues,
        summary: combinedSummary,
        score: Math.round(totalScore / Math.max(chunks.length, 1)),
        strengths: [...new Set(allStrengths)].slice(0, 3),
      });
    } catch (err) {
      console.error("Proofread error:", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const allIssues  = result?.issues ?? [];
  const filtered   = allIssues.filter((i) => {
    if (activeTab === "all")         return true;
    if (activeTab === "errors")      return i.severity === "error";
    if (activeTab === "warnings")    return i.severity === "warning";
    return i.severity === "suggestion";
  });
  const errorCount  = allIssues.filter((i) => i.severity === "error").length;
  const warningCount = allIssues.filter((i) => i.severity === "warning").length;
  const suggCount   = allIssues.filter((i) => i.severity === "suggestion").length;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "fixed", right: 0, top: "48px", bottom: 0,
            width: "320px", display: "flex", flexDirection: "column",
            zIndex: 40, background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border-color)",
          }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", height: "48px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BookCheck style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <div>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                  Proofreader
                </span>
                {currentChapterTitle && (
                  <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: 0 }}>
                    {currentChapterTitle}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose}
              style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
              <X style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

            {/* Category selector + mode */}
            {!hasRun && !loading && (
              <div>
                {/* Mode toggle */}
                <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "8px" }}>
                  Proofread
                </p>
                <div style={{ display: "flex", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", padding: "3px", gap: "2px", marginBottom: "12px" }}>
                  <button
                    onClick={() => setMode("chapter")}
                    style={{
                      flex: 1, padding: "6px 8px",
                      fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600,
                      border: "none", cursor: "pointer", transition: "all 0.15s",
                      background: mode === "chapter" ? "var(--gold-primary)" : "transparent",
                      color: mode === "chapter" ? "var(--bg-primary)" : "var(--text-muted)",
                    }}>
                    Current Chapter
                  </button>
                  <button
                    onClick={() => { if (selectionText) setMode("selection"); }}
                    disabled={!selectionText}
                    style={{
                      flex: 1, padding: "6px 8px",
                      fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600,
                      border: "none", cursor: selectionText ? "pointer" : "not-allowed",
                      transition: "all 0.15s",
                      background: mode === "selection" ? "var(--gold-primary)" : "transparent",
                      color: mode === "selection" ? "var(--bg-primary)" : selectionText ? "var(--text-muted)" : "var(--text-dim)",
                      opacity: selectionText ? 1 : 0.5,
                    }}>
                    Selection {selectionText ? `(${selectionText.split(/\s+/).filter(Boolean).length}w)` : ""}
                  </button>
                </div>

                {/* Selection preview */}
                {mode === "selection" && selectionText && (
                  <div style={{ padding: "10px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", borderLeft: "2px solid var(--gold-primary)", marginBottom: "12px" }}>
                    <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "4px" }}>
                      Selected text
                    </p>
                    <p style={{ fontSize: "12px", fontFamily: "var(--font-cormorant)", fontStyle: "italic", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                      &quot;{selectionText.slice(0, 150)}{selectionText.length > 150 ? "…" : ""}&quot;
                    </p>
                  </div>
                )}

                {mode === "selection" && !selectionText && (
                  <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontStyle: "italic", color: "var(--text-dim)", marginBottom: "12px" }}>
                    Select text in the editor to proofread a specific passage.
                  </p>
                )}

                {mode === "chapter" && editor && (
                  <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", marginBottom: "12px" }}>
                    Chapter: <span style={{ color: "var(--gold-primary)", fontWeight: 500 }}>
                      {getCurrentChapter(editor, content).title}
                    </span>
                  </p>
                )}

                {/* Category selector */}
                <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "8px" }}>
                  What to check
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "12px" }}>
                  {SCAN_CATEGORIES.map((cat) => {
                    const selected = selectedCategories.has(cat.id);
                    return (
                      <button
                        key={cat.id}
                        onClick={() => toggleCategory(cat.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: "10px",
                          padding: "10px 12px", cursor: "pointer",
                          border: "none", transition: "all 0.15s", textAlign: "left",
                          background: selected ? "var(--gold-subtle)" : "var(--bg-elevated)",
                          borderLeft: selected ? "2px solid var(--gold-primary)" : "2px solid transparent",
                        }}>
                        <div style={{ width: "14px", height: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, background: selected ? "var(--gold-primary)" : "transparent", border: `1px solid ${selected ? "var(--gold-primary)" : "var(--border-color)"}` }}>
                          {selected && <span style={{ color: "var(--bg-primary)", fontSize: "9px", fontWeight: 700 }}>✓</span>}
                        </div>
                        <span style={{ fontSize: "14px", flexShrink: 0 }}>{cat.icon}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 500, color: "var(--text-primary)", margin: "0 0 1px" }}>{cat.label}</p>
                          <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: 0 }}>{cat.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Select all / none */}
                <div style={{ display: "flex", gap: "6px", marginBottom: "16px" }}>
                  <button
                    onClick={() => setSelectedCategories(new Set(SCAN_CATEGORIES.map((c) => c.id)))}
                    style={{ fontSize: "11px", fontFamily: "var(--font-inter)", padding: "4px 10px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer" }}>
                    Select all
                  </button>
                  <button
                    onClick={() => setSelectedCategories(new Set([SCAN_CATEGORIES[0].id]))}
                    style={{ fontSize: "11px", fontFamily: "var(--font-inter)", padding: "4px 10px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-dim)", cursor: "pointer" }}>
                    Clear
                  </button>
                </div>

                <button
                  onClick={() => void runCheck()}
                  disabled={selectedCategories.size === 0 || (mode === "selection" && !selectionText)}
                  style={{
                    width: "100%", padding: "10px",
                    background: "var(--gold-primary)", color: "var(--bg-primary)",
                    border: "none", cursor: "pointer",
                    fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 600,
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
                    opacity: selectedCategories.size === 0 ? 0.5 : 1,
                  }}>
                  <BookCheck style={{ width: "14px", height: "14px" }} />
                  Proofread {mode === "selection" ? "Selection" : `— ${selectedCategories.size} categor${selectedCategories.size === 1 ? "y" : "ies"}`}
                </button>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <Loader2 style={{ width: "28px", height: "28px", color: "var(--gold-primary)", margin: "0 auto 1rem" }} className="animate-spin" />
                <p style={{ fontSize: "13px", fontFamily: "var(--font-inter)", fontStyle: "italic", color: "var(--text-muted)", marginBottom: "4px" }}>
                  Reading your {mode === "selection" ? "selection" : "chapter"}…
                </p>
                <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                  This may take up to a minute.
                </p>
                {progress > 0 && (
                  <div style={{ marginTop: "16px" }}>
                    <div style={{ height: "2px", background: "var(--border-color)", marginBottom: "4px" }}>
                      <motion.div
                        style={{ height: "100%", background: "var(--gold-primary)" }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                    <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>{progress}%</p>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div style={{ padding: "12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: "12px", fontFamily: "var(--font-inter)", marginBottom: "12px" }}>
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>Proofread failed</p>
                <p style={{ marginBottom: "10px" }}>{error}</p>
                <button
                  onClick={() => void runCheck()}
                  style={{ width: "100%", padding: "8px", background: "var(--gold-primary)", color: "var(--bg-primary)", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600 }}>
                  Try Again
                </button>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ScoreDisplay score={result.score} strengths={result.strengths ?? []} />

                {result.summary && (
                  <p style={{ fontFamily: "var(--font-cormorant)", fontSize: "14px", fontStyle: "italic", color: "var(--text-muted)", marginBottom: "16px", lineHeight: 1.6 }}>
                    {result.summary}
                  </p>
                )}

                {allIssues.length === 0 && (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <CheckCircle2 style={{ width: "36px", height: "36px", color: "#22c55e", margin: "0 auto 12px" }} />
                    <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", marginBottom: "4px" }}>Clean {mode === "selection" ? "selection" : "chapter"}!</p>
                    <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)" }}>No significant issues found.</p>
                  </div>
                )}

                {allIssues.length > 0 && (
                  <>
                    {/* Filter tabs */}
                    <div style={{ display: "flex", gap: "1px", marginBottom: "12px", padding: "3px", background: "var(--bg-elevated)" }}>
                      {[
                        { key: "all",         label: `All ${allIssues.length}` },
                        { key: "errors",      label: `Errors ${errorCount}` },
                        { key: "warnings",    label: `Warnings ${warningCount}` },
                        { key: "suggestions", label: `Tips ${suggCount}` },
                      ].map(({ key, label }) => (
                        <button key={key}
                          onClick={() => setActiveTab(key as typeof activeTab)}
                          style={{
                            flex: 1, padding: "5px 4px",
                            fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600,
                            border: "none", cursor: "pointer", transition: "all 0.15s",
                            background: activeTab === key ? "var(--gold-primary)" : "transparent",
                            color: activeTab === key ? "var(--bg-primary)" : "var(--text-muted)",
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {filtered.map((issue, i) => (
                      <IssueCard key={i} issue={issue} editor={editor} />
                    ))}
                  </>
                )}

                {/* Actions */}
                <div style={{ display: "flex", gap: "6px", marginTop: "16px" }}>
                  <button
                    onClick={() => void runCheck()}
                    style={{ flex: 1, padding: "8px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", color: "var(--text-secondary)", fontSize: "12px", fontFamily: "var(--font-inter)", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
                    Check Again
                  </button>
                  <button
                    onClick={() => { setResult(null); setHasRun(false); }}
                    style={{ flex: 1, padding: "8px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-dim)", fontSize: "12px", fontFamily: "var(--font-inter)", cursor: "pointer", transition: "all 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
                    ← Categories
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}