"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { TextSelection } from "@tiptap/pm/state";
import {
  fetchThesaurus,
  isEmpty,
  MAX_QUERY_LENGTH,
  matchCase,
  splitPossessive,
  type ThesaurusResult,
} from "@/lib/thesaurus";

interface ThesaurusPanelProps {
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Stands in for images and other non-text nodes, one character each. */
const OBJECT = String.fromCharCode(0xfffc);

interface Target {
  from: number;
  to: number;
  text: string;
}

/**
 * The selected word or short phrase (up to four words, within one paragraph),
 * without the spaces, quotes or punctuation around it that a double-click or
 * drag can pick up.
 */
function selectionTarget(editor: Editor): Target | null {
  const { from, to, empty, $from, $to } = editor.state.selection;
  if (empty || !$from.sameParent($to) || !$from.parent.isTextblock) return null;
  const raw = editor.state.doc.textBetween(from, to, "\n", OBJECT);
  const lead = /^[^\p{L}\p{N}]*/u.exec(raw)![0].length;
  if (lead === raw.length) return null;
  const trail = /[^\p{L}\p{N}]*$/u.exec(raw)![0].length;
  const text = raw.slice(lead, raw.length - trail);
  if (text.includes(OBJECT) || text.split(/\s+/).length > 4) return null;
  return { from: from + lead, to: to - trail, text };
}

function WordChip({
  word,
  onClick,
  action,
}: {
  word: string;
  onClick: () => void;
  action: string;
}) {
  return (
    <button
      onClick={onClick}
      title={`${action} “${word}”`}
      style={{
        padding: "4px 10px",
        fontSize: "12px",
        fontFamily: "var(--font-inter)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border-color)",
        color: "var(--text-secondary)",
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
        (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)";
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
  action,
  onSelect,
}: {
  title: string;
  words: string[];
  action: string;
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
          <WordChip
            key={word}
            word={word}
            action={action}
            onClick={() => onSelect(word)}
          />
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
  const [result, setResult] = useState<ThesaurusResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  /** The selected text a click would replace, if any. */
  const [targetText, setTargetText] = useState<string | null>(null);

  const lookupSeq = useRef(0);
  const lookupAbort = useRef<AbortController | null>(null);
  /** Selected text already dealt with, so it isn't looked up again. */
  const handled = useRef<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const flash = (text: string) => {
    setNotice(text);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(null), 2500);
  };

  const lookup = useCallback(async (word: string, fresh = false) => {
    const query = word.trim();
    if (!query) return;
    // Only the latest lookup's results count.
    const id = ++lookupSeq.current;
    lookupAbort.current?.abort();
    if (query.length > MAX_QUERY_LENGTH || query.split(/\s+/).length > 4) {
      setLoading(false);
      setResult(null);
      setError("Look up a word or a phrase of up to four words.");
      return;
    }
    const abort = new AbortController();
    lookupAbort.current = abort;

    setLoading(true);
    setError(null);
    setResult(null);
    setActiveWord(query);
    setNotice(null);

    try {
      const data = await fetchThesaurus(query, { signal: abort.signal, fresh });
      if (id !== lookupSeq.current) return;
      if (isEmpty(data)) {
        setError(`No results found for “${query}”`);
      } else {
        setResult(data);
        const key = query.toLowerCase();
        setHistory((prev) => [key, ...prev.filter((w) => w !== key)].slice(0, 8));
      }
    } catch (err) {
      if (id === lookupSeq.current) {
        setError(err instanceof Error ? err.message : "Couldn't reach the thesaurus.");
      }
    } finally {
      if (id === lookupSeq.current) setLoading(false);
    }
  }, []);

  // Look up the word selected in the editor: the one selected when the panel
  // opens, then each new one.
  useEffect(() => {
    if (!editor || !isOpen) return;
    handled.current = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const target = selectionTarget(editor);
      setTargetText(target?.text ?? null);
      if (!target) {
        handled.current = null;
        return;
      }
      // The same text: a collaborator's edit moved the selection, or it's the
      // word just put in from this panel.
      if (target.text === handled.current) return;
      handled.current = target.text;
      const { query } = splitPossessive(target.text);
      setSearchInput(query);
      void lookup(query);
    };
    // Every transaction, not just "selectionUpdate": that only fires when the
    // selection moves, not when the text inside it changes. Waits for a drag
    // or shift-select to settle.
    const onTransaction = () => {
      clearTimeout(timer);
      timer = setTimeout(check, 250);
    };
    editor.on("transaction", onTransaction);
    timer = setTimeout(check, 0);
    return () => {
      clearTimeout(timer);
      editor.off("transaction", onTransaction);
    };
  }, [editor, isOpen, lookup]);

  const handleSearch = () => {
    if (searchInput.trim()) void lookup(searchInput);
  };

  const copy = (word: string) => {
    if (!navigator.clipboard) {
      flash("Select a word in the editor to replace it");
      return;
    }
    navigator.clipboard.writeText(word).then(
      () => flash(`✓ Copied “${word}”`),
      () => flash(`Couldn't copy “${word}”`),
    );
  };

  /** Replace the selected word (keeping its formatting and capitals), or copy the word. */
  const choose = (word: string) => {
    const target = editor?.isEditable ? selectionTarget(editor) : null;
    if (!editor || !target) {
      copy(word);
      return;
    }
    const insert =
      matchCase(target.text, word) + splitPossessive(target.text).suffix;
    const { from, to } = target;
    // insertText keeps marks that cover the whole word (italics, comments).
    const tr = editor.state.tr.insertText(insert, from, to);
    // Leave the new word selected so another choice can replace it in turn.
    tr.setSelection(TextSelection.create(tr.doc, from, from + insert.length));
    handled.current = insert;
    setTargetText(insert);
    editor.view.dispatch(tr);
    editor.view.focus();
    flash(`✓ Replaced with “${insert}”`);
  };

  const action = targetText ? "Replace with" : "Copy";

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
              title="Close"
              aria-label="Close thesaurus"
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
                  maxLength={MAX_QUERY_LENGTH}
                  aria-label="Word or phrase to look up"
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
                title="Look up"
                aria-label="Look up"
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
            {/* Replaced / copied confirmation */}
            {notice && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                role="status"
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
                {notice}
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
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "8px",
                    marginBottom: "16px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: "var(--font-dm-sans)",
                        fontWeight: 800,
                        fontSize: "1.25rem",
                        letterSpacing: "-0.02em",
                        color: "var(--text-primary)",
                        margin: 0,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {activeWord}
                      {result.lemma && (
                        <span
                          style={{
                            fontFamily: "var(--font-inter)",
                            fontWeight: 400,
                            fontSize: "11px",
                            letterSpacing: 0,
                            color: "var(--text-dim)",
                            marginLeft: "8px",
                          }}
                        >
                          form of “{result.lemma}”
                        </span>
                      )}
                    </h3>
                    <p
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-inter)",
                        color: "var(--text-muted)",
                        margin: "2px 0 0",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {targetText
                        ? `Click a word to replace “${targetText}”`
                        : "Click a word to copy it, or select a word in the editor to replace it"}
                    </p>
                  </div>
                  <button
                    onClick={() => void lookup(activeWord, true)}
                    title="Look up again"
                    aria-label="Look up again"
                    style={{
                      color: "var(--text-dim)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      padding: "4px",
                      flexShrink: 0,
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
                  action={action}
                  onSelect={choose}
                />
                <ResultSection
                  title="More Specific"
                  words={result.specific}
                  action={action}
                  onSelect={choose}
                />
                <ResultSection
                  title="Related Words"
                  words={result.related}
                  action={action}
                  onSelect={choose}
                />
                <ResultSection
                  title="More General"
                  words={result.general}
                  action={action}
                  onSelect={choose}
                />
                <ResultSection
                  title="Antonyms"
                  words={result.antonyms}
                  action={action}
                  onSelect={choose}
                />
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
