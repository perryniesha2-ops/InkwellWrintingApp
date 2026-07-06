"use client;";

import { useState, useEffect, useRef, useCallback } from "react";
import type { RefObject } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Loader2, Check, X, RefreshCw } from "lucide-react";

interface Position {
  x: number;
  y: number;
}

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
  const [position, setPosition] = useState<Position | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isFeedback, setIsFeedback] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);
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
    const flip = spaceAbove < 180 && spaceBelow > spaceAbove;

    setFlipped(flip);
    setSelectedText(text);
    setResult(null);
    setActiveAction(null);
    setIsFeedback(false);
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
        "You are Inkwell, a precise literary writing assistant.",
        genre ? `The writer is working in the ${genre} genre.` : "",
        "When asked to rewrite or transform text, return ONLY the result — no preamble, no explanation, no quotation marks.",
        "When asked for feedback, be specific, honest, and constructive.",
        "IMPORTANT: Use the Story Bible to ensure any suggestions are consistent with established characters, world rules, and tone.",
        bibleContext ?? "",
      ]
        .filter(Boolean)
        .join("\n");

      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
      const data = await response.json();
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
  };

  const handleRetry = () => {
    const action = QUICK_ACTIONS.find((a) => a.id === activeAction);
    if (action) void runAction(action);
  };

  const toolbarStyle = {
    background: "var(--bg-surface)",
    border: "1px solid var(--border-color)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
    fontFamily: "Inter, sans-serif",
  };

  const btnBase = {
    padding: "5px 8px",
    fontSize: "11px",
    fontFamily: "Inter",
    fontWeight: 500,
    border: "none",
    cursor: "pointer",
    transition: "all 0.15s",
    whiteSpace: "nowrap" as const,
    background: "transparent",
  };

  return (
    <>
      {/* ── Floating action bar ── */}
      <AnimatePresence>
        {position && (
          <motion.div
            ref={toolbarRef}
            initial={{ opacity: 0, y: flipped ? -4 : 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: flipped ? -4 : 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="fixed z-50"
            style={{
              left: Math.max(8, Math.min(position.x, window.innerWidth - 480)),
              top: position.y,
              transform: flipped
                ? "translate(-50%, 0)"
                : "translate(-50%, -100%)",
            }}
          >
            <div
              style={{
                ...toolbarStyle,
                display: "flex",
                alignItems: "center",
                gap: "1px",
                padding: "3px",
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
                    fontFamily: "Inter",
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
                    ...btnBase,
                    color:
                      activeAction === action.id && loading
                        ? "var(--gold-primary)"
                        : "var(--text-muted)",
                    background:
                      activeAction === action.id && loading
                        ? "var(--gold-subtle)"
                        : "transparent",
                    opacity: loading && activeAction !== action.id ? 0.4 : 1,
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

              {/* Divider + close */}
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
                onClick={handleClose}
                title="Dismiss (Esc)"
                style={{
                  ...btnBase,
                  padding: "5px 6px",
                  color: "var(--text-dim)",
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
            </div>

            {/* Arrow */}
            {!flipped && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  top: "100%",
                  width: 0,
                  height: 0,
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderTop: "4px solid var(--border-color)",
                }}
              />
            )}
            {flipped && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  transform: "translateX(-50%)",
                  bottom: "100%",
                  width: 0,
                  height: 0,
                  borderLeft: "4px solid transparent",
                  borderRight: "4px solid transparent",
                  borderBottom: "4px solid var(--border-color)",
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Result panel — fixed bottom right ── */}
      <AnimatePresence>
        {result !== null && (
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed z-50"
            style={{
              ...toolbarStyle,
              bottom: "80px",
              right: "16px",
              width: "340px",
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
                    fontFamily: "Inter",
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
                      fontFamily: "Inter",
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
                  fontFamily: "Inter",
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
                  fontFamily: "Cormorant Garamond, Georgia, serif",
                  fontStyle: "italic",
                  color: "var(--text-muted)",
                  lineHeight: 1.6,
                  margin: 0,
                }}
                className="line-clamp-3"
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
                  fontFamily: "Inter",
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
                  fontFamily: "Cormorant Garamond, Georgia, serif",
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
              {!isFeedback && (
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
                    fontFamily: "Inter",
                    fontWeight: 600,
                  }}
                >
                  <Check style={{ width: "12px", height: "12px" }} />
                  Replace
                </button>
              )}
              {isFeedback && (
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
                    fontFamily: "Inter",
                    fontWeight: 600,
                  }}
                >
                  <Check style={{ width: "12px", height: "12px" }} />
                  Insert Note
                </button>
              )}
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
                  fontFamily: "Inter",
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
                  fontFamily: "Inter",
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
