"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookText,
  X,
  Loader2,
  Search,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

interface DamuseWord {
  word: string;
  score: number;
  tags?: string[];
}

interface WordResult {
  synonyms: string[];
  related: string[];
  moreSpecific: string[];
  moreGeneral: string[];
  antonyms: string[];
}

interface ThesaurusPanelProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

async function fetchWordData(word: string): Promise<WordResult> {
  const encoded = encodeURIComponent(word.toLowerCase().trim());

  const [synonyms, related, moreSpecific, moreGeneral, antonyms] =
    await Promise.all([
      fetch(`https://api.datamuse.com/words?rel_syn=${encoded}&max=15`).then(
        (r) => r.json(),
      ) as Promise<DamuseWord[]>,
      fetch(`https://api.datamuse.com/words?ml=${encoded}&max=12`).then((r) =>
        r.json(),
      ) as Promise<DamuseWord[]>,
      fetch(`https://api.datamuse.com/words?rel_spc=${encoded}&max=10`).then(
        (r) => r.json(),
      ) as Promise<DamuseWord[]>,
      fetch(`https://api.datamuse.com/words?rel_gen=${encoded}&max=8`).then(
        (r) => r.json(),
      ) as Promise<DamuseWord[]>,
      fetch(`https://api.datamuse.com/words?rel_ant=${encoded}&max=8`).then(
        (r) => r.json(),
      ) as Promise<DamuseWord[]>,
    ]);

  return {
    synonyms: synonyms.map((w) => w.word),
    related: related.map((w) => w.word),
    moreSpecific: moreSpecific.map((w) => w.word),
    moreGeneral: moreGeneral.map((w) => w.word),
    antonyms: antonyms.map((w) => w.word),
  };
}

function WordChip({
  word,
  onClick,
  color,
}: {
  word: string;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={`Replace with "${word}"`}
      style={{
        padding: "4px 10px",
        fontSize: "12px",
        fontFamily: "var(--font-inter)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
        color: color ?? "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 0.15s",
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--gold-subtle)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--gold-border)";
        (e.currentTarget as HTMLElement).style.color = "var(--gold-primary)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background =
          "var(--bg-elevated)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--border-color)";
        (e.currentTarget as HTMLElement).style.color =
          color ?? "var(--text-secondary)";
      }}
    >
      {word}
      <ArrowRight style={{ width: "10px", height: "10px", opacity: 0.5 }} />
    </button>
  );
}

function ResultSection({
  title,
  words,
  onSelect,
}: {
  title: string;
  words: string[];
  onSelect: (word: string) => void;
}) {
  if (words.length === 0) return null;
  return (
    <div style={{ marginBottom: "16px" }}>
      <p
        style={{
          fontSize: "10px",
          fontFamily: "var(--font-inter)",
          fontWeight: 600,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: "8px",
        }}
      >
        {title}
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
        {words.map((word) => (
          <WordChip key={word} word={word} onClick={() => onSelect(word)} />
        ))}
      </div>
    </div>
  );
}

export default function ThesaurusPanel({
  editor,
  isOpen,
  onClose,
}: ThesaurusPanelProps) {
  const [searchInput, setSearchInput] = useState("");
  const [activeWord, setActiveWord] = useState("");
  const [result, setResult] = useState<WordResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [replaced, setReplaced] = useState<string | null>(null);

  const lookup = useCallback(async (word: string) => {
    const trimmed = word.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveWord(trimmed);
    setReplaced(null);

    try {
      const data = await fetchWordData(trimmed);
      const hasResults = Object.values(data).some((arr) => arr.length > 0);
      if (!hasResults) {
        setError(`No results found for "${trimmed}"`);
      } else {
        setResult(data);
        setHistory((prev) => {
          const filtered = prev.filter((w) => w !== trimmed);
          return [trimmed, ...filtered].slice(0, 8);
        });
      }
    } catch {
      setError("Failed to fetch results. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-detect selected word from editor
  useEffect(() => {
    if (!editor || !isOpen) return;

    const handleSelectionChange = () => {
      const { from, to } = editor.state.selection;
      if (from === to) return;
      const selectedText = editor.state.doc.textBetween(from, to, " ").trim();
      const wordCount = selectedText.split(/\s+/).filter(Boolean).length;
      if (selectedText && wordCount <= 4) {
        setSearchInput(selectedText);
        void lookup(selectedText);
      }
    };

    editor.on("selectionUpdate", handleSelectionChange);
    return () => {
      editor.off("selectionUpdate", handleSelectionChange);
    };
  }, [editor, isOpen, lookup]);

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (searchInput.trim()) void lookup(searchInput);
  };

  const replaceInEditor = (newWord: string) => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    if (from !== to) {
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, newWord)
        .run();
      setReplaced(newWord);
    } else {
      // No selection — just copy to clipboard
      void navigator.clipboard.writeText(newWord);
      setReplaced(newWord);
    }
    setTimeout(() => setReplaced(null), 2000);
  };

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
            width: "320px",
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
              <BookText
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
                Thesaurus
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

          {/* Search */}
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--border-color)",
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <div style={{ flex: 1, position: "relative" }}>
                <Search
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "13px",
                    height: "13px",
                    color: "var(--text-dim)",
                  }}
                />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  placeholder="Search a word or phrase…"
                  style={{
                    width: "100%",
                    paddingLeft: "32px",
                    paddingRight: "10px",
                    paddingTop: "8px",
                    paddingBottom: "8px",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                    color: "var(--text-primary)",
                    fontSize: "13px",
                    fontFamily: "var(--font-inter)",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "var(--gold-primary)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "var(--border-color)";
                  }}
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading || !searchInput.trim()}
                style={{
                  padding: "8px 12px",
                  background: searchInput.trim()
                    ? "var(--gold-primary)"
                    : "var(--bg-elevated)",
                  color: searchInput.trim()
                    ? "var(--bg-primary)"
                    : "var(--text-dim)",
                  border: "none",
                  cursor: searchInput.trim() ? "pointer" : "not-allowed",
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                {loading ? (
                  <Loader2
                    style={{ width: "14px", height: "14px" }}
                    className="animate-spin"
                  />
                ) : (
                  <Search style={{ width: "14px", height: "14px" }} />
                )}
              </button>
            </div>

            {/* Tip */}
            <p
              style={{
                fontSize: "10px",
                fontFamily: "var(--font-inter)",
                color: "var(--text-dim)",
                marginTop: "6px",
              }}
            >
              Select a word in the editor to look it up automatically
            </p>
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            {/* Replaced confirmation */}
            {replaced && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  padding: "8px 12px",
                  background: "var(--gold-subtle)",
                  border: "1px solid var(--gold-border)",
                  marginBottom: "12px",
                  fontSize: "12px",
                  fontFamily: "var(--font-inter)",
                  color: "var(--gold-primary)",
                }}
              >
                ✓ Replaced with &quot;{replaced}&quot;
              </motion.div>
            )}

            {/* History */}
            {!loading && !result && history.length > 0 && (
              <div style={{ marginBottom: "16px" }}>
                <p
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    marginBottom: "8px",
                  }}
                >
                  Recent
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {history.map((word) => (
                    <button
                      key={word}
                      onClick={() => {
                        setSearchInput(word);
                        void lookup(word);
                      }}
                      style={{
                        padding: "4px 10px",
                        fontSize: "12px",
                        fontFamily: "var(--font-inter)",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-color)",
                        color: "var(--text-muted)",
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
                      {word}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
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

            {/* Error */}
            {error && !loading && (
              <div
                style={{
                  padding: "12px",
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#f87171",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {/* Active word header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "16px",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontWeight: 800,
                        fontSize: "1.25rem",
                        letterSpacing: "-0.02em",
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      {activeWord}
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-inter)",
                        color: "var(--text-muted)",
                        margin: 0,
                      }}
                    >
                      Click any word to replace selection
                    </p>
                  </div>
                  <button
                    onClick={() => void lookup(activeWord)}
                    style={{
                      color: "var(--text-dim)",
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
                        "var(--text-dim)";
                    }}
                  >
                    <RefreshCw style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>

                <div
                  style={{
                    height: "1px",
                    background: "var(--border-color)",
                    marginBottom: "16px",
                  }}
                />

                <ResultSection
                  title="Synonyms"
                  words={result.synonyms}
                  onSelect={replaceInEditor}
                />
                <ResultSection
                  title="Related Words"
                  words={result.related}
                  onSelect={replaceInEditor}
                />
                <ResultSection
                  title="More Specific"
                  words={result.moreSpecific}
                  onSelect={replaceInEditor}
                />
                <ResultSection
                  title="More General"
                  words={result.moreGeneral}
                  onSelect={replaceInEditor}
                />
                {result.antonyms.length > 0 && (
                  <ResultSection
                    title="Antonyms"
                    words={result.antonyms}
                    onSelect={replaceInEditor}
                  />
                )}
              </motion.div>
            )}

            {/* Empty state */}
            {!loading && !result && !error && history.length === 0 && (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <BookText
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
                  Find the perfect word.
                </p>
                <p
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-inter)",
                    color: "var(--text-dim)",
                  }}
                >
                  Select a word in your manuscript or search above.
                </p>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
