"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, X } from "lucide-react";
import { buildChapterTree, flattenChapterTree, type Chapter } from "@/lib/chapters";
import { analyzeReadability, type SentenceRef, type TextSource } from "@/lib/readability";

interface ReadabilityPanelProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  /** Jump to a sentence; resolves to false if it can't be found. */
  onGoToQuote: (chapterId: string, quote: string) => Promise<boolean>;
  onOpenChapter: (chapterId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

/** Wait this long after typing stops before re-analyzing. */
const DEBOUNCE_MS = 500;

const font = { fontFamily: "var(--font-inter)" } as const;
const card: React.CSSProperties = { padding: "14px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)" };
const sectionLabel: React.CSSProperties = {
  ...font, fontSize: "10px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase",
  color: "var(--text-dim)", margin: "0 0 12px",
};
const GOOD = "#22c55e";
const WARN = "#f59e0b";
const BAD = "#ef4444";

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...card, padding: "14px 8px", textAlign: "center" }}>
      <div style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", color: "var(--text-primary)", lineHeight: 1, marginBottom: "4px" }}>
        {value}
      </div>
      <div style={{ ...font, fontSize: "11px", color: "var(--text-muted)", fontWeight: 500 }}>{label}</div>
    </div>
  );
}

function Bar({ value, color }: { value: number; color: string }) {
  return (
    <div style={{ height: "3px", background: "var(--border-color)", borderRadius: "2px", overflow: "hidden" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: "2px" }}
      />
    </div>
  );
}

function MetricRow({ label, value, bar, color, note }: {
  label: string; value: string; bar?: number; color: string; note: string;
}) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ ...font, fontSize: "12px", color: "var(--text-muted)" }}>{label}</span>
        <span style={{ ...font, fontSize: "12px", fontWeight: 600, color }}>{value}</span>
      </div>
      {bar !== undefined && <Bar value={bar} color={color} />}
      <p style={{ ...font, fontSize: "10.5px", fontStyle: "italic", color: "var(--text-dim)", margin: "4px 0 0" }}>{note}</p>
    </div>
  );
}

function Chips({ items }: { items: { word: string; count: number }[] }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
      {items.map((i) => (
        <span key={i.word} style={{ ...font, fontSize: "11px", padding: "2px 7px", border: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
          {i.word} <span style={{ color: "var(--text-dim)" }}>×{i.count}</span>
        </span>
      ))}
    </div>
  );
}

function SentenceList({ items, chapterTitles, showChapter, onGoToQuote }: {
  items: SentenceRef[];
  chapterTitles: Map<string, string>;
  showChapter: boolean;
  onGoToQuote: ReadabilityPanelProps["onGoToQuote"];
}) {
  const [missing, setMissing] = useState<string | null>(null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
      {items.map((s, i) => {
        const key = `${s.sourceId}-${i}`;
        return (
          <div key={key}>
            <button
              onClick={async () => setMissing((await onGoToQuote(s.sourceId, s.text)) ? null : key)}
              title="Show in the editor"
              style={{ ...font, display: "block", width: "100%", textAlign: "left", background: "var(--bg-primary)", border: "none", borderLeft: "2px solid var(--gold-border)", padding: "5px 8px", cursor: "pointer" }}>
              {showChapter && (
                <span style={{ display: "block", fontSize: "10px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gold-primary)", marginBottom: "2px" }}>
                  {chapterTitles.get(s.sourceId) || "Untitled"}
                </span>
              )}
              <span style={{ fontSize: "11.5px", lineHeight: 1.5, color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {s.text}
              </span>
              {s.words > 25 && <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>{s.words} words</span>}
            </button>
            {missing === key && (
              <p style={{ ...font, margin: "3px 0 0", fontSize: "10.5px", color: "var(--text-dim)" }}>Couldn&apos;t find this sentence. It may have changed.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const easeLabel = (score: number) =>
  score >= 80 ? "Very easy" : score >= 70 ? "Easy" : score >= 60 ? "Standard" : score >= 50 ? "Fairly hard" : "Hard";
const easeColor = (score: number) => (score >= 60 ? GOOD : score >= 50 ? WARN : BAD);

export default function ReadabilityPanel({
  chapters, activeChapterId, onGoToQuote, onOpenChapter, isOpen, onClose,
}: ReadabilityPanelProps) {
  const [scope, setScope] = useState<"chapter" | "book">("chapter");

  const ordered = useMemo(() => flattenChapterTree(buildChapterTree(chapters)), [chapters]);
  const chapterTitles = useMemo(() => new Map(chapters.map((c) => [c.id, c.title])), [chapters]);
  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null;

  const sources = useMemo<TextSource[]>(() => {
    const toSource = (c: Chapter) => ({ id: c.id, html: c.content });
    if (scope === "book") return ordered.map(toSource);
    return activeChapter ? [toSource(activeChapter)] : [];
  }, [scope, ordered, activeChapter]);

  // Re-analyze shortly after typing stops; immediately on opening or on a new chapter or scope.
  const sourceKey = `${scope}:${activeChapterId}:${isOpen}`;
  const [analyzed, setAnalyzed] = useState({ key: sourceKey, sources });
  if (analyzed.key !== sourceKey) setAnalyzed({ key: sourceKey, sources });
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => setAnalyzed({ key: sourceKey, sources }), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isOpen, sourceKey, sources]);

  const stats = useMemo(() => (isOpen ? analyzeReadability(analyzed.sources) : null), [isOpen, analyzed]);
  const byChapter = useMemo(
    () => (isOpen && scope === "book"
      ? analyzed.sources.map((s) => ({ id: s.id, stats: analyzeReadability([s]) })).filter((c) => c.stats)
      : []),
    [isOpen, scope, analyzed],
  );

  const enoughForRates = (stats?.wordCount ?? 0) >= 300;
  const v = stats?.sentenceLengthVariety;

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
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px", height: "48px", flexShrink: 0, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart2 style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Readability</span>
            </div>
            <button onClick={onClose} title="Close" style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}>
              <X style={{ width: "14px", height: "14px" }} />
            </button>
          </div>

          <div style={{ padding: "12px 16px 0", flexShrink: 0 }}>
            <div role="radiogroup" aria-label="What to analyze" style={{ display: "flex", border: "1px solid var(--border-color)" }}>
              {([["chapter", "This chapter"], ["book", "Whole book"]] as const).map(([key, text]) => (
                <button key={key} role="radio" aria-checked={scope === key} onClick={() => setScope(key)}
                  style={{ ...font, flex: 1, padding: "5px 8px", fontSize: "12px", border: "none", cursor: "pointer", background: scope === key ? "var(--gold-subtle)" : "transparent", color: scope === key ? "var(--gold-primary)" : "var(--text-muted)" }}>
                  {text}
                </button>
              ))}
            </div>
            <p style={{ ...font, fontSize: "11px", color: "var(--text-dim)", margin: "6px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {scope === "chapter" ? activeChapter?.title || "No chapter open" : `${ordered.length} chapters`} · updates as you write
            </p>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 16px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {!stats ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <BarChart2 style={{ width: "32px", height: "32px", color: "var(--gold-primary)", opacity: 0.3, margin: "0 auto 1rem" }} />
                <p style={{ ...font, fontSize: "13px", color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>
                  {scope === "chapter" ? "This chapter has no text yet." : "No text to analyze yet."}
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <StatCard label="Words" value={stats.wordCount.toLocaleString()} />
                  <StatCard label="Reading time" value={`${stats.readingTime} min`} />
                  <StatCard label="Sentences" value={stats.sentenceCount.toLocaleString()} />
                  <StatCard label="Paragraphs" value={stats.paragraphCount.toLocaleString()} />
                </div>

                {/* Reading ease */}
                <div style={card}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
                    <div>
                      <p style={{ ...font, fontSize: "13px", fontWeight: 600, color: "var(--text-primary)", margin: 0 }}>Reading ease</p>
                      <p style={{ ...font, fontSize: "11px", color: "var(--text-muted)", margin: 0 }}>Flesch score · grade {stats.gradeLevel.toFixed(1)}</p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "2rem", color: easeColor(stats.fleschScore), lineHeight: 1 }}>{stats.fleschScore}</span>
                      <p style={{ ...font, fontSize: "11px", color: easeColor(stats.fleschScore), margin: 0, fontWeight: 600 }}>{easeLabel(stats.fleschScore)}</p>
                    </div>
                  </div>
                  <Bar value={stats.fleschScore} color={easeColor(stats.fleschScore)} />
                  <p style={{ ...font, fontSize: "10.5px", fontStyle: "italic", color: "var(--text-dim)", margin: "6px 0 0" }}>
                    Higher is easier to read. Most popular fiction scores between 70 and 90.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  {[["Avg sentence", `${stats.avgWordsPerSentence} words`], ["Avg paragraph", `${stats.avgWordsPerParagraph} words`]].map(([label, value]) => (
                    <div key={label} style={{ ...card, padding: "12px" }}>
                      <span style={{ ...font, fontSize: "10px", color: "var(--text-dim)" }}>{label}</span>
                      <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", margin: "4px 0 0" }}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Sentence variety */}
                {v && (
                  <div style={card}>
                    <p style={sectionLabel}>Sentence length variety</p>
                    <div style={{ display: "flex", gap: "2px", height: "8px", borderRadius: "4px", overflow: "hidden", marginBottom: "8px" }}>
                      {v.short > 0 && <div style={{ flex: v.short, background: GOOD }} />}
                      {v.medium > 0 && <div style={{ flex: v.medium, background: "var(--gold-primary)" }} />}
                      {v.long > 0 && <div style={{ flex: v.long, background: v.long > 30 ? BAD : WARN }} />}
                    </div>
                    <div style={{ ...font, display: "flex", gap: "12px", fontSize: "10px", color: "var(--text-muted)" }}>
                      <span>Short {v.short}%</span><span>Medium {v.medium}%</span><span>Long {v.long}%</span>
                    </div>
                    <p style={{ ...font, fontSize: "11px", fontStyle: "italic", color: "var(--text-muted)", margin: "6px 0 0" }}>
                      {v.long > 30
                        ? "Many long sentences. Breaking some up can help the pace."
                        : v.short > 70 && stats.sentenceCount >= 10
                          ? "Mostly short sentences. A few longer ones can vary the rhythm."
                          : "Good mix of sentence lengths."}
                    </p>
                    {stats.longestSentences.length > 0 && (
                      <>
                        <p style={{ ...sectionLabel, margin: "14px 0 0" }}>Longest sentences</p>
                        <SentenceList items={stats.longestSentences} chapterTitles={chapterTitles} showChapter={scope === "book"} onGoToQuote={onGoToQuote} />
                      </>
                    )}
                  </div>
                )}

                {/* Style */}
                <div style={card}>
                  <p style={sectionLabel}>Style</p>
                  <MetricRow
                    label="Passive voice"
                    value={`${stats.passiveVoicePercent}% of sentences`}
                    bar={stats.passiveVoicePercent * 2}
                    color={stats.passiveVoicePercent > 15 ? BAD : stats.passiveVoicePercent > 8 ? WARN : GOOD}
                    note={stats.passiveVoicePercent > 15
                      ? "High. Active voice usually reads more directly."
                      : stats.passiveVoicePercent > 8 ? "Moderate. Worth a look in key scenes." : "Low. Mostly active voice."}
                  />
                  {stats.passiveExamples.length > 0 && (
                    <div style={{ margin: "-6px 0 14px" }}>
                      <SentenceList items={stats.passiveExamples} chapterTitles={chapterTitles} showChapter={scope === "book"} onGoToQuote={onGoToQuote} />
                    </div>
                  )}
                  <MetricRow
                    label="Dialogue"
                    value={`${stats.dialoguePercent}% of words`}
                    bar={stats.dialoguePercent}
                    color="var(--gold-primary)"
                    note={stats.dialoguePercent === 0
                      ? "No dialogue here."
                      : stats.dialoguePercent > 60 ? "Dialogue-heavy." : stats.dialoguePercent < 15 ? "Mostly narration." : "A mix of dialogue and narration."}
                  />
                  <MetricRow
                    label="Adverbs (-ly)"
                    value={enoughForRates ? `${stats.adverbsPer1000} per 1,000 words` : `${stats.adverbCount}`}
                    color={!enoughForRates ? "var(--text-primary)" : stats.adverbsPer1000 > 15 ? BAD : stats.adverbsPer1000 > 10 ? WARN : GOOD}
                    note={!enoughForRates
                      ? "Write a little more for a meaningful rate."
                      : stats.adverbsPer1000 > 15 ? "On the high side. Stronger verbs can often replace them."
                        : stats.adverbsPer1000 > 10 ? "Moderate." : "Light. Not overusing adverbs."}
                  />
                  {stats.topAdverbs.length > 0 && <div style={{ margin: "-8px 0 14px" }}><Chips items={stats.topAdverbs} /></div>}
                  <div>
                    <span style={{ ...font, fontSize: "12px", color: "var(--text-muted)" }}>Most repeated words</span>
                    {stats.repeatedWords.length > 0
                      ? <Chips items={stats.repeatedWords} />
                      : <p style={{ ...font, fontSize: "10.5px", fontStyle: "italic", color: "var(--text-dim)", margin: "4px 0 0" }}>No words stand out yet.</p>}
                  </div>
                </div>

                {/* Per chapter */}
                {scope === "book" && byChapter.length > 1 && (
                  <div style={card}>
                    <p style={sectionLabel}>By chapter</p>
                    {byChapter.map(({ id, stats: s }) => (
                      <button key={id} onClick={() => onOpenChapter(id)} title="Open this chapter"
                        style={{ ...font, display: "flex", alignItems: "baseline", gap: "8px", width: "100%", textAlign: "left", padding: "5px 0", background: "none", border: "none", borderBottom: "1px solid var(--border-color)", cursor: "pointer" }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: "12px", color: id === activeChapterId ? "var(--gold-primary)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {chapterTitles.get(id) || "Untitled"}
                        </span>
                        <span style={{ fontSize: "10.5px", color: "var(--text-dim)", flexShrink: 0 }}>{s!.wordCount.toLocaleString()} w</span>
                        <span title="Reading ease" style={{ fontSize: "10.5px", fontWeight: 600, color: easeColor(s!.fleschScore), flexShrink: 0, width: "22px", textAlign: "right" }}>{s!.fleschScore}</span>
                      </button>
                    ))}
                    <p style={{ ...font, fontSize: "10.5px", fontStyle: "italic", color: "var(--text-dim)", margin: "6px 0 0" }}>Words and reading ease for each chapter.</p>
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
