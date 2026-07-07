"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart2, X, Loader2, RefreshCw } from "lucide-react";
import { analyzeReadability } from "@/lib/readability";
import type { ReadabilityStats } from "@/lib/readability";

interface ReadabilityPanelProps {
  content: string;
  isOpen: boolean;
  onClose: () => void;
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div
      style={{
        padding: "16px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 800,
          fontSize: "1.75rem",
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          lineHeight: 1,
          marginBottom: "4px",
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: "11px",
          fontFamily: "var(--font-inter)",
          color: "var(--text-muted)",
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      {sub && (
        <div
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-inter)",
            color: "var(--text-dim)",
            marginTop: "2px",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const color = score >= 70 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";
  const readability = score >= 70 ? "Easy" : score >= 50 ? "Moderate" : "Hard";

  return (
    <div
      style={{
        padding: "16px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "8px",
        }}
      >
        <div>
          <p
            style={{
              fontSize: "13px",
              fontFamily: "var(--font-inter)",
              fontWeight: 600,
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-inter)",
              color: "var(--text-muted)",
              margin: 0,
            }}
          >
            Flesch Reading Ease
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <span
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 800,
              fontSize: "2rem",
              color,
              lineHeight: 1,
            }}
          >
            {score}
          </span>
          <p
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-inter)",
              color,
              margin: 0,
              fontWeight: 600,
            }}
          >
            {readability}
          </p>
        </div>
      </div>
      <div
        style={{
          height: "4px",
          background: "var(--border-color)",
          borderRadius: "2px",
          overflow: "hidden",
        }}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: "2px" }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "4px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-inter)",
            color: "var(--text-dim)",
          }}
        >
          Hard
        </span>
        <span
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-inter)",
            color: "var(--text-dim)",
          }}
        >
          Easy
        </span>
      </div>
    </div>
  );
}

function MetricRow({
  label,
  value,
  bar,
  barColor,
  note,
}: {
  label: string;
  value: string;
  bar?: number;
  barColor?: string;
  note?: string;
}) {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "4px",
        }}
      >
        <span
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-inter)",
            color: "var(--text-muted)",
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-inter)",
            fontWeight: 600,
            color: barColor ?? "var(--text-primary)",
          }}
        >
          {value}
        </span>
      </div>
      {bar !== undefined && (
        <div
          style={{
            height: "3px",
            background: "var(--border-color)",
            borderRadius: "2px",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(bar, 100)}%` }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            style={{
              height: "100%",
              background: barColor ?? "var(--gold-primary)",
              borderRadius: "2px",
            }}
          />
        </div>
      )}
      {note && (
        <p
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-inter)",
            fontStyle: "italic",
            color: "var(--text-dim)",
            marginTop: "3px",
          }}
        >
          {note}
        </p>
      )}
    </div>
  );
}

export default function ReadabilityPanel({
  content,
  isOpen,
  onClose,
}: ReadabilityPanelProps) {
  const [stats, setStats] = useState<ReadabilityStats | null>(null);
  const [loading, setLoading] = useState(false);

  const analyze = useCallback(() => {
    if (!content || typeof window === "undefined") return;

    setTimeout(() => {
      setLoading(true);
      try {
        const result = analyzeReadability(content);
        setStats(result);
      } catch (err) {
        console.error("Readability error:", err);
      } finally {
        setLoading(false);
      }
    }, 0);
  }, [content]);

  useEffect(() => {
    if (isOpen && content) analyze();
  }, [isOpen, analyze, content]);

  const sentLengthColor = (pct: number) =>
    pct > 20 ? "#ef4444" : pct > 10 ? "#f59e0b" : "#22c55e";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "fixed",
            right: 0,
            top: "48px", // ← starts below the topbar
            bottom: 0,
            width: "320px",
            display: "flex",
            flexDirection: "column",
            zIndex: 40,
            background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border-color)",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 16px",
              height: "48px",
              flexShrink: 0,
              borderBottom: "1px solid var(--border-color)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart2
                style={{
                  width: "14px",
                  height: "14px",
                  color: "var(--gold-primary)",
                }}
              />
              <span
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Readability
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <button
                onClick={analyze}
                disabled={loading}
                style={{
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  padding: "4px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-muted)";
                }}
              >
                <RefreshCw
                  style={{ width: "13px", height: "13px" }}
                  className={loading ? "animate-spin" : ""}
                />
              </button>
              <button
                onClick={onClose}
                style={{
                  color: "var(--text-muted)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  padding: "4px",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-muted)";
                }}
              >
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "4rem",
                }}
              >
                <Loader2
                  style={{
                    width: "24px",
                    height: "24px",
                    color: "var(--gold-primary)",
                  }}
                  className="animate-spin"
                />
              </div>
            )}

            {stats && !loading && (
              <>
                {/* Stat cards */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <StatCard
                    label="Words"
                    value={stats.wordCount.toLocaleString()}
                  />
                  <StatCard
                    label="Reading Time"
                    value={`${stats.readingTime} min`}
                  />
                  <StatCard
                    label="Sentences"
                    value={stats.sentenceCount.toLocaleString()}
                  />
                  <StatCard
                    label="Paragraphs"
                    value={stats.paragraphCount.toLocaleString()}
                  />
                </div>

                {/* Flesch score */}
                <ScoreBar score={stats.fleschScore} label="Readability Score" />

                {/* Grade & avg sentence */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "8px",
                  }}
                >
                  <div
                    style={{
                      padding: "12px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-inter)",
                          color: "var(--text-dim)",
                        }}
                      >
                        Grade Level
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      Grade {stats.gradeLevel.toFixed(1)}
                    </p>
                  </div>
                  <div
                    style={{
                      padding: "12px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "10px",
                          fontFamily: "var(--font-inter)",
                          color: "var(--text-dim)",
                        }}
                      >
                        Avg Sentence
                      </span>
                    </div>
                    <p
                      style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {stats.avgSentenceLength.toFixed(1)} words
                    </p>
                  </div>
                </div>

                {/* Font size note */}
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text-dim)",
                      }}
                    >
                      Avg Word Length
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        marginLeft: "auto",
                      }}
                    >
                      {stats.avgWordLength.toFixed(1)} chars
                    </span>
                  </div>
                  <div
                    style={{
                      height: "3px",
                      background: "var(--border-color)",
                      marginTop: "8px",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.min((stats.avgWordLength / 8) * 100, 100)}%`,
                      }}
                      transition={{ duration: 0.6 }}
                      style={{
                        height: "100%",
                        background: "var(--gold-primary)",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                </div>

                {/* Sentence length variety */}
                <div
                  style={{
                    padding: "14px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-inter)",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--text-dim)",
                      marginBottom: "12px",
                    }}
                  >
                    Sentence Length Variety
                  </p>
                  <div
                    style={{
                      display: "flex",
                      gap: "4px",
                      height: "8px",
                      borderRadius: "4px",
                      overflow: "hidden",
                      marginBottom: "8px",
                    }}
                  >
                    <div
                      style={{
                        width: `${stats.sentenceLengthVariety.short}%`,
                        background: "#22c55e",
                      }}
                    />
                    <div
                      style={{
                        width: `${stats.sentenceLengthVariety.medium}%`,
                        background: "var(--gold-primary)",
                      }}
                    />
                    <div
                      style={{
                        width: `${stats.sentenceLengthVariety.long}%`,
                        background: sentLengthColor(
                          stats.sentenceLengthVariety.long,
                        ),
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-inter)",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "#22c55e",
                          display: "inline-block",
                        }}
                      />
                      Short {stats.sentenceLengthVariety.short}%
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-inter)",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: "var(--gold-primary)",
                          display: "inline-block",
                        }}
                      />
                      Medium {stats.sentenceLengthVariety.medium}%
                    </span>
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-inter)",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "50%",
                          background: sentLengthColor(
                            stats.sentenceLengthVariety.long,
                          ),
                          display: "inline-block",
                        }}
                      />
                      Long {stats.sentenceLengthVariety.long}%
                    </span>
                  </div>
                  <p
                    style={{
                      fontSize: "11px",
                      fontFamily: "var(--font-inter)",
                      fontStyle: "italic",
                      color: "var(--text-muted)",
                      marginTop: "6px",
                    }}
                  >
                    {stats.sentenceLengthVariety.long > 20
                      ? "Too many long sentences — vary your rhythm"
                      : stats.sentenceLengthVariety.short > 50
                        ? "Many short sentences — add some longer ones"
                        : "Good sentence variety."}
                  </p>
                </div>

                {/* Style metrics */}
                <div
                  style={{
                    padding: "14px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  <p
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-inter)",
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--text-dim)",
                      marginBottom: "12px",
                    }}
                  >
                    Style Metrics
                  </p>

                  <MetricRow
                    label="Passive Voice"
                    value={`${stats.passiveVoicePercent}%`}
                    bar={stats.passiveVoicePercent}
                    barColor={
                      stats.passiveVoicePercent > 15 ? "#ef4444" : "#22c55e"
                    }
                    note={
                      stats.passiveVoicePercent > 15
                        ? "High — consider active voice"
                        : "Good — mostly active voice"
                    }
                  />

                  <MetricRow
                    label="Dialogue"
                    value={`${stats.dialoguePercent}%`}
                    bar={stats.dialoguePercent}
                    barColor="var(--gold-primary)"
                    note={
                      stats.dialoguePercent < 10
                        ? "Low — consider adding more dialogue"
                        : "Good balance"
                    }
                  />

                  <MetricRow
                    label="Adverbs (-ly words)"
                    value={stats.adverbCount.toLocaleString()}
                    barColor={
                      stats.adverbCount > 100
                        ? "#ef4444"
                        : "var(--gold-primary)"
                    }
                    note={
                      stats.adverbCount > 100
                        ? `${stats.adverbCount} — consider reducing`
                        : "Good — not overusing adverbs"
                    }
                  />

                  <MetricRow
                    label="Unique Words"
                    value={`${stats.uniqueWordPercent}%`}
                    bar={stats.uniqueWordPercent}
                    barColor="var(--gold-primary)"
                    note={
                      stats.uniqueWordPercent < 40
                        ? "Low vocabulary variety"
                        : "Good vocabulary variety"
                    }
                  />
                </div>

                {/* Refresh */}
                <button
                  onClick={analyze}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    fontFamily: "var(--font-inter)",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-primary)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--gold-border)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.color =
                      "var(--text-muted)";
                    (e.currentTarget as HTMLElement).style.borderColor =
                      "var(--border-color)";
                  }}
                >
                  <RefreshCw style={{ width: "12px", height: "12px" }} />
                  Refresh Analysis
                </button>
              </>
            )}

            {!stats && !loading && (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <BarChart2
                  style={{
                    width: "32px",
                    height: "32px",
                    color: "var(--gold-primary)",
                    opacity: 0.3,
                    margin: "0 auto 1rem",
                  }}
                />
                <p
                  style={{
                    fontSize: "13px",
                    fontFamily: "var(--font-inter)",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  No content to analyze yet.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
