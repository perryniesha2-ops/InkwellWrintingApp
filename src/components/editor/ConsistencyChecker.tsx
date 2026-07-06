"use client;";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ConsistencyIssue {
  type: "character" | "continuity" | "world" | "timeline" | "style";
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  quote: string;
  suggestion: string;
}

interface ConsistencyResult {
  issues: ConsistencyIssue[];
  summary: string;
  score: number;
}

interface ConsistencyCheckerProps {
  content: string;
  bibleContext: string;
  isOpen: boolean;
  onClose: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  character: "Character",
  continuity: "Continuity",
  world: "World Building",
  timeline: "Timeline",
  style: "Style",
};

const TYPE_COLORS: Record<string, string> = {
  character: "#d97706",
  continuity: "#ef4444",
  world: "#8b5cf6",
  timeline: "#06b6d4",
  style: "#6b7280",
};

function SeverityIcon({ severity }: { severity: string }) {
  if (severity === "high")
    return <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;
  if (severity === "medium")
    return (
      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
    );
  return <Info className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div
      style={{
        position: "relative",
        width: "88px",
        height: "88px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        style={{ width: "88px", height: "88px", transform: "rotate(-90deg)" }}
        viewBox="0 0 88 88"
      >
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke="var(--border-color)"
          strokeWidth="6"
        />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div style={{ position: "absolute", textAlign: "center" }}>
        <span
          style={{
            fontFamily: "DM Sans",
            fontWeight: 800,
            fontSize: "22px",
            color,
          }}
        >
          {score}
        </span>
        <span
          style={{
            display: "block",
            fontSize: "10px",
            fontFamily: "Inter",
            color: "var(--text-dim)",
          }}
        >
          / 100
        </span>
      </div>
    </div>
  );
}

function IssueCard({ issue }: { issue: ConsistencyIssue }) {
  const [expanded, setExpanded] = useState(false);
  const color = TYPE_COLORS[issue.type] ?? "#6b7280";

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        border: "1px solid var(--border-color)",
        background: "var(--bg-elevated)",
        marginBottom: "6px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "8px",
          padding: "10px 12px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <SeverityIcon severity={issue.severity} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "2px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "11px",
                fontFamily: "DM Sans",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {issue.title}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontFamily: "Inter",
                fontWeight: 600,
                letterSpacing: "0.06em",
                padding: "2px 6px",
                background: `${color}18`,
                color,
              }}
            >
              {TYPE_LABELS[issue.type] ?? issue.type}
            </span>
          </div>
          {!expanded && (
            <p
              style={{
                fontSize: "11px",
                fontFamily: "Inter",
                color: "var(--text-muted)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {issue.description}
            </p>
          )}
        </div>
        {expanded ? (
          <ChevronUp
            style={{
              width: "13px",
              height: "13px",
              color: "var(--text-muted)",
              flexShrink: 0,
              marginTop: "2px",
            }}
          />
        ) : (
          <ChevronDown
            style={{
              width: "13px",
              height: "13px",
              color: "var(--text-muted)",
              flexShrink: 0,
              marginTop: "2px",
            }}
          />
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "0 12px 12px",
                borderTop: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{
                  paddingTop: "10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <div>
                  <p
                    style={{
                      fontSize: "10px",
                      fontFamily: "Inter",
                      fontWeight: 600,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "var(--text-dim)",
                      marginBottom: "4px",
                    }}
                  >
                    Issue
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      fontFamily: "Inter",
                      color: "var(--text-primary)",
                      lineHeight: 1.6,
                    }}
                  >
                    {issue.description}
                  </p>
                </div>
                {issue.quote && (
                  <div>
                    <p
                      style={{
                        fontSize: "10px",
                        fontFamily: "Inter",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text-dim)",
                        marginBottom: "4px",
                      }}
                    >
                      In your text
                    </p>
                    <p
                      style={{
                        fontFamily: "Cormorant Garamond, Georgia, serif",
                        fontSize: "13px",
                        fontStyle: "italic",
                        padding: "8px 10px",
                        background: "var(--bg-surface)",
                        borderLeft: "2px solid var(--gold-primary)",
                        color: "var(--text-primary)",
                      }}
                    >
                      &quot;{issue.quote}&quot;
                    </p>
                  </div>
                )}
                {issue.suggestion && (
                  <div>
                    <p
                      style={{
                        fontSize: "10px",
                        fontFamily: "Inter",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--text-dim)",
                        marginBottom: "4px",
                      }}
                    >
                      Suggestion
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        fontFamily: "Inter",
                        color: "var(--text-primary)",
                        lineHeight: 1.6,
                      }}
                    >
                      {issue.suggestion}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ConsistencyChecker({
  content,
  bibleContext,
  isOpen,
  onClose,
}: ConsistencyCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsistencyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runCheck = async () => {
    if (!bibleContext) {
      setError(
        "No Story Bible found. Add characters, outline, or world building entries first.",
      );
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const plainText = content.replace(/<[^>]+>/g, " ").slice(0, 4000);

      const response = await fetch("/api/consistency-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document: plainText,
          bibleContext: bibleContext.slice(0, 3000),
        }),
      });

      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error ?? "Check failed");
      }

      const data = (await response.json()) as ConsistencyResult;
      setResult(data);
    } catch (err) {
      console.error("Consistency check error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const highCount =
    result?.issues.filter((i) => i.severity === "high").length ?? 0;
  const medCount =
    result?.issues.filter((i) => i.severity === "medium").length ?? 0;
  const lowCount =
    result?.issues.filter((i) => i.severity === "low").length ?? 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 w-80 xl:w-96 flex flex-col z-40"
          style={{
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
              borderBottom: "1px solid var(--border-color)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck
                style={{
                  width: "14px",
                  height: "14px",
                  color: "var(--gold-primary)",
                }}
              />
              <span
                style={{
                  fontFamily: "DM Sans",
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                Consistency Check
              </span>
            </div>
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

          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {/* Initial state */}
            {!result && !loading && !error && (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "var(--gold-subtle)",
                    border: "1px solid var(--gold-border)",
                    margin: "0 auto 1rem",
                  }}
                >
                  <ShieldCheck
                    style={{
                      width: "22px",
                      height: "22px",
                      color: "var(--gold-primary)",
                    }}
                  />
                </div>
                <h3
                  style={{
                    fontFamily: "DM Sans",
                    fontWeight: 700,
                    fontSize: "16px",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                  }}
                >
                  Story Consistency
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    fontFamily: "Inter",
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                    marginBottom: "1.5rem",
                    lineHeight: 1.6,
                  }}
                >
                  Scan your document against your Story Bible to find character
                  inconsistencies, continuity errors, and world building
                  contradictions.
                </p>
                <button
                  onClick={() => void runCheck()}
                  style={{
                    padding: "10px 20px",
                    background: "var(--gold-primary)",
                    color: "var(--bg-primary)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: "Inter",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <ShieldCheck style={{ width: "14px", height: "14px" }} />
                  Run Check
                </button>
                {!bibleContext && (
                  <p
                    style={{
                      fontSize: "11px",
                      fontFamily: "Inter",
                      color: "var(--text-dim)",
                      marginTop: "12px",
                      fontStyle: "italic",
                    }}
                  >
                    Add Story Bible entries first for best results.
                  </p>
                )}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
                <Loader2
                  style={{
                    width: "28px",
                    height: "28px",
                    color: "var(--gold-primary)",
                    margin: "0 auto 1rem",
                  }}
                  className="animate-spin"
                />
                <p
                  style={{
                    fontSize: "13px",
                    fontFamily: "Inter",
                    fontStyle: "italic",
                    color: "var(--text-muted)",
                    marginBottom: "4px",
                  }}
                >
                  Reading your story…
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    fontFamily: "Inter",
                    color: "var(--text-dim)",
                  }}
                >
                  This may take a moment for longer documents.
                </p>
              </div>
            )}

            {/* Error */}
            {error && !loading && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontSize: "12px",
                  fontFamily: "Inter",
                  marginBottom: "12px",
                }}
              >
                <p style={{ fontWeight: 600, marginBottom: "4px" }}>
                  Check failed
                </p>
                <p style={{ marginBottom: "10px" }}>{error}</p>
                <button
                  onClick={() => void runCheck()}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--gold-primary)",
                    color: "var(--bg-primary)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontFamily: "Inter",
                    fontWeight: 600,
                  }}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Score */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    padding: "16px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                    marginBottom: "16px",
                  }}
                >
                  <ScoreRing score={result.score} />
                  <div style={{ flex: 1 }}>
                    <p
                      style={{
                        fontFamily: "DM Sans",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      {result.score >= 80
                        ? "Looking good!"
                        : result.score >= 60
                          ? "Some issues found"
                          : "Needs attention"}
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        fontFamily: "Inter",
                        color: "var(--text-muted)",
                        lineHeight: 1.5,
                        marginBottom: "8px",
                      }}
                    >
                      {result.summary}
                    </p>
                    {result.issues.length > 0 && (
                      <div style={{ display: "flex", gap: "10px" }}>
                        {highCount > 0 && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontFamily: "Inter",
                              fontWeight: 600,
                              color: "#ef4444",
                            }}
                          >
                            {highCount} high
                          </span>
                        )}
                        {medCount > 0 && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontFamily: "Inter",
                              fontWeight: 600,
                              color: "#f59e0b",
                            }}
                          >
                            {medCount} medium
                          </span>
                        )}
                        {lowCount > 0 && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontFamily: "Inter",
                              fontWeight: 600,
                              color: "#60a5fa",
                            }}
                          >
                            {lowCount} low
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* No issues */}
                {result.issues.length === 0 && (
                  <div style={{ textAlign: "center", padding: "2rem" }}>
                    <CheckCircle2
                      style={{
                        width: "36px",
                        height: "36px",
                        color: "#22c55e",
                        margin: "0 auto 12px",
                      }}
                    />
                    <p
                      style={{
                        fontFamily: "DM Sans",
                        fontWeight: 700,
                        fontSize: "14px",
                        color: "var(--text-primary)",
                        marginBottom: "4px",
                      }}
                    >
                      No inconsistencies found
                    </p>
                    <p
                      style={{
                        fontSize: "11px",
                        fontFamily: "Inter",
                        color: "var(--text-muted)",
                      }}
                    >
                      Your story is consistent with the Story Bible.
                    </p>
                  </div>
                )}

                {/* Issues */}
                {result.issues.length > 0 && (
                  <div>
                    <p
                      style={{
                        fontSize: "10px",
                        fontFamily: "Inter",
                        fontWeight: 600,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--text-dim)",
                        marginBottom: "8px",
                      }}
                    >
                      {result.issues.length} Issue
                      {result.issues.length !== 1 ? "s" : ""} Found
                    </p>
                    {["high", "medium", "low"].flatMap((sev) =>
                      result.issues
                        .filter((i) => i.severity === sev)
                        .map((issue, idx) => (
                          <IssueCard key={`${sev}-${idx}`} issue={issue} />
                        )),
                    )}
                  </div>
                )}

                {/* Run again */}
                <button
                  onClick={() => void runCheck()}
                  style={{
                    width: "100%",
                    marginTop: "12px",
                    padding: "8px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    fontFamily: "Inter",
                    cursor: "pointer",
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
                  Run Check Again
                </button>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
