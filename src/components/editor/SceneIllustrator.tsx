"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Palette,
  X,
  Loader2,
  Copy,
  Check,
  ImageIcon,
  User,
  BookImage,
  Sparkles,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

interface PromptResult {
  portrait: { title: string; prompt: string; tool: string };
  scene: { title: string; prompt: string; tool: string };
  cover: { title: string; prompt: string; tool: string };
  mood: string;
  style: string;
  characters_detected: string[];
}

interface SceneIllustratorProps {
  editor: Editor | null;
  genre?: string;
  bibleContext?: string;
  isOpen: boolean;
  onClose: () => void;
}

function PromptCard({
  icon: Icon,
  title,
  prompt,
  tool,
}: {
  icon: React.ElementType;
  title: string;
  prompt: string;
  tool: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
        marginBottom: "10px",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 12px",
          borderBottom: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Icon
            style={{
              width: "13px",
              height: "13px",
              color: "var(--gold-primary)",
            }}
          />
          <span
            style={{
              fontSize: "11px",
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              color: "var(--text-primary)",
            }}
          >
            {title}
          </span>
        </div>
        <button
          onClick={() => void handleCopy()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 8px",
            fontSize: "10px",
            fontFamily: "var(--font-inter)",
            fontWeight: 600,
            background: copied ? "rgba(34,197,94,0.1)" : "var(--bg-surface)",
            border: `1px solid ${copied ? "rgba(34,197,94,0.3)" : "var(--border-color)"}`,
            color: copied ? "#22c55e" : "var(--text-muted)",
            cursor: "pointer",
            transition: "all 0.15s",
          }}
        >
          {copied ? (
            <>
              <Check style={{ width: "10px", height: "10px" }} /> Copied
            </>
          ) : (
            <>
              <Copy style={{ width: "10px", height: "10px" }} /> Copy
            </>
          )}
        </button>
      </div>

      {/* Prompt text */}
      <div style={{ padding: "10px 12px" }}>
        <p
          style={{
            fontSize: "12px",
            fontFamily: "var(--font-inter)",
            color: "var(--text-secondary)",
            lineHeight: 1.65,
            margin: "0 0 8px 0",
          }}
        >
          {prompt}
        </p>
        <p
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-inter)",
            color: "var(--text-dim)",
            fontStyle: "italic",
            margin: 0,
          }}
        >
          {tool}
        </p>
      </div>
    </div>
  );
}

export default function SceneIllustrator({
  editor,
  genre,
  bibleContext,
  isOpen,
  onClose,
}: SceneIllustratorProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PromptResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [activeTab, setActiveTab] = useState<"selection" | "manual">(
    "selection",
  );

  // Track selected text from editor
  useEffect(() => {
    if (!editor || !isOpen) return;

    const updateSelection = () => {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      const text = editor.state.doc.textBetween(from, to, " ").trim();
      if (text.length > 20) setSelectedText(text);
    };

    editor.on("selectionUpdate", updateSelection);
    // Check current selection on open
    updateSelection();
    return () => {
      editor.off("selectionUpdate", updateSelection);
    };
  }, [editor, isOpen]);

  const generate = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setLoading(true);
      setResult(null);
      setError(null);

      try {
        const response = await fetch("/api/scene-prompt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scene: text.slice(0, 1500),
            bibleContext: bibleContext?.slice(0, 2000) ?? "",
            genre: genre ?? "",
          }),
        });

        if (!response.ok) throw new Error("Failed to generate prompts");

        const data = (await response.json()) as PromptResult;
        setResult(data);
      } catch (err) {
        console.error("Illustrator error:", err);
        setError("Failed to generate prompts. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [bibleContext, genre],
  );

  const handleGenerate = () => {
    const text = activeTab === "selection" ? selectedText : manualInput;
    void generate(text);
  };

  const activeText = activeTab === "selection" ? selectedText : manualInput;

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
            top: "48px",
            bottom: 0,
            width: "340px",
            display: "flex",
            flexDirection: "column",
            zIndex: 40,
            background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border-color)",
            fontFamily: "var(--font-inter)",
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
              <Palette
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
                Scene Illustrator
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

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {/* Tab toggle */}
            <div
              style={{
                display: "flex",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-color)",
                padding: "3px",
                gap: "2px",
                marginBottom: "14px",
              }}
            >
              {(["selection", "manual"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setResult(null);
                    setError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "6px 8px",
                    fontSize: "11px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    background:
                      activeTab === tab ? "var(--gold-primary)" : "transparent",
                    color:
                      activeTab === tab
                        ? "var(--bg-primary)"
                        : "var(--text-muted)",
                  }}
                >
                  {tab === "selection" ? "From Selection" : "Write a Scene"}
                </button>
              ))}
            </div>

            {/* Selection tab */}
            {activeTab === "selection" && (
              <div style={{ marginBottom: "14px" }}>
                {selectedText ? (
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-color)",
                      borderLeft: "2px solid var(--gold-primary)",
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
                        marginBottom: "6px",
                      }}
                    >
                      Selected text
                    </p>
                    <p
                      style={{
                        fontSize: "12px",
                        fontFamily: "var(--font-cormorant)",
                        fontStyle: "italic",
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      &quot;{selectedText.slice(0, 200)}
                      {selectedText.length > 200 ? "…" : ""}&quot;
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      padding: "16px",
                      textAlign: "center",
                      background: "var(--bg-elevated)",
                      border: "1px dashed var(--border-color)",
                    }}
                  >
                    <ImageIcon
                      style={{
                        width: "24px",
                        height: "24px",
                        color: "var(--text-dim)",
                        margin: "0 auto 8px",
                      }}
                    />
                    <p
                      style={{
                        fontSize: "12px",
                        fontFamily: "var(--font-inter)",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                        margin: 0,
                      }}
                    >
                      Select a passage in your manuscript to generate image
                      prompts for it.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Manual tab */}
            {activeTab === "manual" && (
              <div style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "10px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    marginBottom: "6px",
                  }}
                >
                  Describe your scene
                </label>
                <textarea
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  placeholder="Describe the scene, characters, setting, mood…"
                  rows={5}
                  style={{
                    width: "100%",
                    resize: "none",
                    outline: "none",
                    padding: "10px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    fontFamily: "var(--font-inter)",
                    lineHeight: 1.6,
                    boxSizing: "border-box",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--gold-primary)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-color)";
                  }}
                />
              </div>
            )}

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !activeText.trim()}
              style={{
                width: "100%",
                padding: "10px",
                background: activeText.trim()
                  ? "var(--gold-primary)"
                  : "var(--bg-elevated)",
                color: activeText.trim()
                  ? "var(--bg-primary)"
                  : "var(--text-dim)",
                border: "none",
                cursor: activeText.trim() ? "pointer" : "not-allowed",
                fontSize: "13px",
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                marginBottom: "16px",
                transition: "all 0.15s",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2
                    style={{ width: "14px", height: "14px" }}
                    className="animate-spin"
                  />{" "}
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles style={{ width: "14px", height: "14px" }} />{" "}
                  Generate Prompts
                </>
              )}
            </button>

            {/* Error */}
            {error && !loading && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontSize: "12px",
                  fontFamily: "var(--font-inter)",
                  marginBottom: "12px",
                }}
              >
                {error}
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Mood / style / characters */}
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                    marginBottom: "12px",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}
                  >
                    {result.mood && (
                      <div>
                        <p
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-inter)",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--text-dim)",
                            margin: "0 0 2px",
                          }}
                        >
                          Mood
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            fontFamily: "var(--font-inter)",
                            color: "var(--text-primary)",
                            margin: 0,
                          }}
                        >
                          {result.mood}
                        </p>
                      </div>
                    )}
                    {result.style && (
                      <div>
                        <p
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-inter)",
                            fontWeight: 600,
                            letterSpacing: "0.08em",
                            textTransform: "uppercase",
                            color: "var(--text-dim)",
                            margin: "0 0 2px",
                          }}
                        >
                          Style
                        </p>
                        <p
                          style={{
                            fontSize: "12px",
                            fontFamily: "var(--font-inter)",
                            color: "var(--text-primary)",
                            margin: 0,
                          }}
                        >
                          {result.style}
                        </p>
                      </div>
                    )}
                  </div>
                  {result.characters_detected?.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        paddingTop: "8px",
                        borderTop: "1px solid var(--border-color)",
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
                          margin: "0 0 4px",
                        }}
                      >
                        Characters detected
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "6px",
                          flexWrap: "wrap",
                        }}
                      >
                        {result.characters_detected.map((char) => (
                          <span
                            key={char}
                            style={{
                              fontSize: "11px",
                              fontFamily: "var(--font-inter)",
                              padding: "2px 8px",
                              background: "var(--gold-subtle)",
                              color: "var(--gold-primary)",
                              border: "1px solid var(--gold-border)",
                            }}
                          >
                            {char}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Prompt cards */}
                <p
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    marginBottom: "10px",
                  }}
                >
                  Image Prompts — click to copy
                </p>

                <PromptCard
                  icon={User}
                  title={result.portrait.title}
                  prompt={result.portrait.prompt}
                  tool={result.portrait.tool}
                />
                <PromptCard
                  icon={ImageIcon}
                  title={result.scene.title}
                  prompt={result.scene.prompt}
                  tool={result.scene.tool}
                />
                <PromptCard
                  icon={BookImage}
                  title={result.cover.title}
                  prompt={result.cover.prompt}
                  tool={result.cover.tool}
                />

                {/* Regenerate */}
                <button
                  onClick={handleGenerate}
                  style={{
                    width: "100%",
                    marginTop: "4px",
                    padding: "8px",
                    background: "transparent",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-muted)",
                    fontSize: "12px",
                    fontFamily: "var(--font-inter)",
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
                  Regenerate
                </button>
              </motion.div>
            )}

            {/* Empty state */}
            {!result && !loading && !error && (
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                <Palette
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
                    marginBottom: "8px",
                  }}
                >
                  Turn your scenes into art.
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-inter)",
                    color: "var(--text-dim)",
                  }}
                >
                  Select a passage or write a scene description to generate
                  image prompts for Midjourney, DALL-E 3, and Leonardo AI.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
