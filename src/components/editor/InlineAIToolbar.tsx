"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  RefreshCw,
  ChevronRight,
} from "lucide-react";

interface InlineAIToolbarProps {
  editorEl: RefObject<HTMLDivElement | null>;
  onReplace: (text: string) => void;
  onInsertAfter: (text: string) => void;
  genre?: string;
  bibleContext?: string;
}

const QUICK_ACTIONS = [
  {
    id: "improve",
    label: "Improve",
    prompt:
      "Improve this text. Make it more engaging and well-crafted. Return only the improved text, no explanation.",
  },
  {
    id: "rephrase",
    label: "Rephrase",
    prompt:
      "Rephrase this text in a fresh way while keeping the same meaning. Return only the rephrased text.",
  },
  {
    id: "expand",
    label: "Expand",
    prompt:
      "Expand this text with more detail and depth. Return only the expanded text.",
  },
  {
    id: "shorten",
    label: "Shorten",
    prompt:
      "Shorten this text to its essential meaning. Return only the shortened text.",
  },
  {
    id: "tension",
    label: "Add Tension",
    prompt:
      "Rewrite this with more tension and urgency. Return only the rewritten text.",
  },
  {
    id: "dialogue",
    label: "To Dialogue",
    prompt:
      "Convert this into natural dialogue between characters. Return only the dialogue.",
  },
  {
    id: "feedback",
    label: "Feedback",
    prompt:
      "Give brief, honest, constructive feedback on this text. What works, what doesn't, and one concrete suggestion.",
  },
];

export default function InlineAIToolbar({
  editorEl,
  onReplace,
  onInsertAfter,
  genre,
  bibleContext,
}: InlineAIToolbarProps) {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [expanded, setExpanded] = useState(false);
  const [selectedText, setSelectedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isFeedback, setIsFeedback] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const resultRef = useRef<string | null>(null);

  useEffect(() => {
    resultRef.current = result;
  }, [result]);

  const handleClose = useCallback(() => {
    setPosition(null);
    setResult(null);
    setActiveAction(null);
    setSelectedText("");
    setIsFeedback(false);
    setExpanded(false);
    setFlipped(false);
    setTimeout(() => {
      editorEl.current?.focus();
    }, 10);
  }, [editorEl]);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.toString().trim()) {
      setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          if (resultRef.current) return;
          setPosition(null);
          setSelectedText("");
          setActiveAction(null);
          setExpanded(false);
        }
      }, 150);
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) return;
    if (editorEl.current && !editorEl.current.contains(selection.anchorNode))
      return;

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const spaceAbove = rect.top;
    const spaceBelow = viewportHeight - rect.bottom;
    const flip = spaceAbove < 60 && spaceBelow > spaceAbove;

    setFlipped(flip);
    setSelectedText(text);
    setResult(null);
    setActiveAction(null);
    setIsFeedback(false);
    setExpanded(false);
    setPosition({
      x: rect.left + rect.width / 2,
      y: flip ? rect.bottom + 8 : rect.top - 8,
    });
  }, [editorEl]);

  useEffect(() => {
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, [handleSelectionChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && position) handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [position, handleClose]);

  const runAction = async (action: (typeof QUICK_ACTIONS)[0]) => {
    if (!selectedText) return;
    setLoading(true);
    setActiveAction(action.id);
    setResult(null);
    setIsFeedback(action.id === "feedback");

    try {
      const systemPrompt = [
        "You are Prosr, a precise literary writing assistant.",
        genre ? `The writer is working in the ${genre} genre.` : "",
        "When asked to rewrite or transform text, return ONLY the result — no preamble, no explanation, no quotation marks.",
        "When asked for feedback, be specific, honest, and constructive.",
        bibleContext ?? "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: `${action.prompt}\n\nText:\n"${selectedText}"`,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Failed to get response");
      const data = (await response.json()) as { content: string };
      setResult(data.content ?? "");
    } catch (err) {
      console.error("Inline AI error:", err);
      setResult("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = () => {
    if (!result) return;
    if (isFeedback) {
      onInsertAfter(`\n\n[AI Feedback: ${result}]`);
    } else {
      onReplace(result);
    }
    handleClose();
  };

  const handleDiscard = () => {
    setResult(null);
    setActiveAction(null);
    setExpanded(false);
  };

  const handleRetry = () => {
    const action = QUICK_ACTIONS.find((a) => a.id === activeAction);
    if (action) void runAction(action);
  };

  if (!position) return null;

  const triggerY = flipped ? position.y : position.y;

  return (
    <>
      {/* ── Trigger button — always visible when text selected ── */}
      <AnimatePresence>
        {position && !result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.1 }}
            style={{
              position: "fixed",
              left: position.x,
              top: triggerY,
              transform: flipped
                ? "translate(-50%, 0)"
                : "translate(-50%, -100%)",
              zIndex: 50,
            }}
          >
            <AnimatePresence mode="wait">
              {!expanded ? (
                // ── Single spark button ──
                <motion.button
                  key="trigger"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.1 }}
                  onClick={() => setExpanded(true)}
                  title="AI Actions"
                  style={{
                    width: "28px",
                    height: "28px",
                    borderRadius: "50%",
                    background: "var(--gold-primary)",
                    color: "var(--bg-primary)",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 2px 12px rgba(212,168,67,0.4)",
                    transition: "transform 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "scale(1.1)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.transform =
                      "scale(1)";
                  }}
                >
                  <Sparkles style={{ width: "13px", height: "13px" }} />
                </motion.button>
              ) : (
                // ── Expanded toolbar ──
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0, scale: 0.95, y: flipped ? -4 : 4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.12 }}
                  style={{
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    gap: "1px",
                    padding: "3px",
                    position: "relative",
                  }}
                >
                  {/* Gold top line */}
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "15%",
                      right: "15%",
                      height: "1px",
                      background: "var(--gold-primary)",
                    }}
                  />

                  {/* AI label */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      padding: "4px 8px",
                      borderRight: "1px solid var(--border-color)",
                      marginRight: "2px",
                      flexShrink: 0,
                    }}
                  >
                    <Sparkles
                      style={{
                        width: "12px",
                        height: "12px",
                        color: "var(--gold-primary)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 600,
                        letterSpacing: "0.08em",
                        color: "var(--gold-primary)",
                        textTransform: "uppercase",
                      }}
                    >
                      AI
                    </span>
                  </div>

                  {/* Action buttons */}
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => void runAction(action)}
                      disabled={loading}
                      style={{
                        padding: "5px 8px",
                        fontSize: "11px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 500,
                        border: "none",
                        cursor: loading ? "not-allowed" : "pointer",
                        transition: "all 0.15s",
                        whiteSpace: "nowrap",
                        background:
                          activeAction === action.id && loading
                            ? "var(--gold-subtle)"
                            : "transparent",
                        color:
                          activeAction === action.id && loading
                            ? "var(--gold-primary)"
                            : "var(--text-muted)",
                        opacity:
                          loading && activeAction !== action.id ? 0.4 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          (e.currentTarget as HTMLElement).style.color =
                            "var(--text-primary)";
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--bg-elevated)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading || activeAction !== action.id) {
                          (e.currentTarget as HTMLElement).style.color =
                            activeAction === action.id && loading
                              ? "var(--gold-primary)"
                              : "var(--text-muted)";
                          (e.currentTarget as HTMLElement).style.background =
                            activeAction === action.id && loading
                              ? "var(--gold-subtle)"
                              : "transparent";
                        }
                      }}
                    >
                      {loading && activeAction === action.id ? (
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <Loader2
                            style={{
                              width: "10px",
                              height: "10px",
                              animation: "spin 1s linear infinite",
                            }}
                          />
                          {action.label}
                        </span>
                      ) : (
                        action.label
                      )}
                    </button>
                  ))}

                  {/* Divider + collapse */}
                  <div
                    style={{
                      width: "1px",
                      height: "16px",
                      background: "var(--border-color)",
                      margin: "0 2px",
                      flexShrink: 0,
                    }}
                  />
                  <button
                    onClick={() => setExpanded(false)}
                    title="Collapse"
                    style={{
                      padding: "5px 6px",
                      color: "var(--text-dim)",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-primary)";
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-dim)";
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <X style={{ width: "12px", height: "12px" }} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result panel ── */}
      <AnimatePresence>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            style={{
              position: "fixed",
              bottom: "80px",
              right: "16px",
              width: "340px",
              zIndex: 50,
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <Sparkles
                  style={{
                    width: "12px",
                    height: "12px",
                    color: "var(--gold-primary)",
                  }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--gold-primary)",
                  }}
                >
                  {isFeedback ? "Feedback" : "Suggestion"}
                </span>
                {loading && (
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "10px",
                      fontFamily: "var(--font-inter)",
                      color: "var(--text-dim)",
                      fontStyle: "italic",
                    }}
                  >
                    <Loader2
                      style={{
                        width: "10px",
                        height: "10px",
                        animation: "spin 1s linear infinite",
                      }}
                    />
                    composing…
                  </span>
                )}
              </div>
              <button
                onClick={handleClose}
                style={{
                  color: "var(--text-dim)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-dim)";
                }}
              >
                <X style={{ width: "13px", height: "13px" }} />
              </button>
            </div>

            {/* Original */}
            <div
              style={{
                padding: "10px 14px 8px",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <p
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  marginBottom: "4px",
                }}
              >
                Original
              </p>
              <p
                style={{
                  fontSize: "12px",
                  fontFamily: "var(--font-cormorant)",
                  fontStyle: "italic",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
              >
                &quot;{selectedText.slice(0, 150)}
                {selectedText.length > 150 ? "…" : ""}&quot;
              </p>
            </div>

            {/* Result */}
            <div
              style={{
                padding: "10px 14px",
                borderBottom: "1px solid var(--border-color)",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              <p
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-dim)",
                  marginBottom: "4px",
                }}
              >
                {isFeedback ? "Feedback" : "Suggestion"}
              </p>
              <p
                style={{
                  fontSize: "14px",
                  fontFamily: "var(--font-cormorant)",
                  color: "var(--text-primary)",
                  lineHeight: 1.8,
                  margin: 0,
                }}
              >
                {result}
              </p>
            </div>

            {/* Actions */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "10px 14px",
              }}
            >
              <button
                onClick={handleAccept}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 12px",
                  background: "var(--gold-primary)",
                  color: "var(--bg-primary)",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 600,
                }}
              >
                <Check style={{ width: "12px", height: "12px" }} />
                {isFeedback ? "Insert Note" : "Replace"}
              </button>
              <button
                onClick={handleRetry}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 10px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "var(--font-inter)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-secondary)";
                }}
              >
                <RefreshCw style={{ width: "11px", height: "11px" }} />
                Retry
              </button>
              <button
                onClick={handleDiscard}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  padding: "6px 10px",
                  background: "transparent",
                  border: "1px solid transparent",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontFamily: "var(--font-inter)",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "var(--border-color)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-dim)";
                  (e.currentTarget as HTMLElement).style.borderColor =
                    "transparent";
                }}
              >
                <X style={{ width: "11px", height: "11px" }} />
                Discard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
