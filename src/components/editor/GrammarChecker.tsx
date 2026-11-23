"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookCheck, Check, CheckCheck, Loader2, RotateCcw, X } from "lucide-react";
import type { Editor } from "@tiptap/react";
import type { Node as PMNode } from "@tiptap/pm/model";
import type { Transaction } from "@tiptap/pm/state";
import {
  PROOF_CATEGORIES, editFor, editKey,
  type Edit, type ProofCategory, type ProofParagraph, type RawSuggestion,
} from "@/lib/proofread";

interface GrammarCheckerProps {
  documentId: string;
  chapterId: string | null;
  chapterTitle: string;
  genre?: string;
  /** The editor showing `chapterId`. */
  editor: Editor | null;
  isOpen: boolean;
  onClose: () => void;
}

/** Target section size sent per request; sections run in parallel. */
const SECTION_CHARS = 6000;
const PARALLEL = 4;
const PREVIEW_CHARS = 28;

interface Suggestion extends RawSuggestion {
  id: string;
  key: string;
  /** For display: text around the change, the removed text and the inserted text. */
  pre: string;
  del: string;
  ins: string;
  post: string;
  /** The text has changed since the check, so the fix can't be applied. */
  stale?: boolean;
}

interface ChapterRun {
  status: "running" | "done";
  total: number;
  finished: number;
  failed: number;
  error?: string;
  suggestions: Suggestion[];
}

const font = { fontFamily: "var(--font-inter)" } as const;
const iconButton: React.CSSProperties = {
  color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px",
};
const CATEGORY = Object.fromEntries(PROOF_CATEGORIES.map((c) => [c.key, c])) as Record<ProofCategory, (typeof PROOF_CATEGORIES)[number]>;

// ── Reading and editing the document ───────────────────

interface Block { n: number; pos: number; text: string }

/** Every text block (paragraph, heading, list item) with its index and position. */
function readBlocks(doc: PMNode): Block[] {
  const blocks: Block[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // One character per inline leaf (hard breaks), so offsets match positions.
    blocks.push({ n: blocks.length, pos, text: node.textBetween(0, node.content.size, undefined, "\n") });
    return false;
  });
  return blocks;
}

/**
 * Where a suggestion applies in the document now: wherever the same edit has
 * the same surrounding text (paragraphs may have been added above it), or in
 * its own paragraph if a nearby fix changed the surroundings. Null when the
 * text it was about has changed.
 */
function findIn(blocks: Block[], s: Suggestion): { block: Block; edit: Edit } | null {
  let fallback: { block: Block; edit: Edit } | null = null;
  for (const block of blocks) {
    const edit = editFor(block.text, s.original, s.replacement);
    if (!edit || block.text.slice(edit.from, edit.to) !== s.del || edit.insert !== s.ins) continue;
    if (editKey(block.text, edit) === s.key) return { block, edit };
    if (block.n === s.paragraph) fallback = { block, edit };
  }
  return fallback;
}
const findInDoc = (doc: PMNode, s: Suggestion) => findIn(readBlocks(doc), s);

function applyEdit(tr: Transaction, block: Block, edit: Edit) {
  const from = block.pos + 1 + edit.from;
  const to = block.pos + 1 + edit.to;
  if (edit.insert) tr.insertText(edit.insert, from, to);
  else tr.delete(from, to);
}

/** Split paragraphs into sections of about SECTION_CHARS. */
function sectionsOf(paragraphs: ProofParagraph[]): ProofParagraph[][] {
  const sections: ProofParagraph[][] = [];
  let current: ProofParagraph[] = [];
  let size = 0;
  for (const p of paragraphs) {
    if (current.length && size + p.text.length > SECTION_CHARS) {
      sections.push(current);
      current = [];
      size = 0;
    }
    current.push(p);
    size += p.text.length;
  }
  if (current.length) sections.push(current);
  return sections;
}

/** Text around an edit for the card, trimmed to whole words; "…" marks a cut. */
function preview(text: string, edit: Edit) {
  const start = Math.max(0, edit.from - PREVIEW_CHARS);
  const end = Math.min(text.length, edit.to + PREVIEW_CHARS);
  const pre = start > 0 ? "…" + text.slice(start, edit.from).replace(/^\S*\s/, "") : text.slice(0, edit.from);
  const post = end < text.length ? text.slice(edit.to, end).replace(/\s\S*$/, "") + "…" : text.slice(edit.to);
  return { pre, del: text.slice(edit.from, edit.to), ins: edit.insert, post };
}

const visibleSpace = (s: string) => (s && !s.trim() ? s.replace(/ /g, "·").replace(/\n/g, "↵") : s);

// ── Suggestion card ────────────────────────────────────

function SuggestionCard({ s, onAccept, onReject, onShow }: {
  s: Suggestion;
  onAccept: () => void;
  onReject: () => void;
  onShow: () => void;
}) {
  const cat = CATEGORY[s.category] ?? CATEGORY.grammar;
  return (
    <div style={{ marginBottom: "8px", border: "1px solid var(--border-color)", background: "var(--bg-elevated)", opacity: s.stale ? 0.6 : 1 }}>
      <button onClick={onShow} disabled={s.stale} title={s.stale ? undefined : "Show in the editor"}
        style={{ ...font, display: "block", width: "100%", textAlign: "left", padding: "10px 10px 6px", background: "none", border: "none", cursor: s.stale ? "default" : "pointer" }}>
        <span style={{ display: "inline-block", fontSize: "10px", fontWeight: 600, letterSpacing: "0.04em", padding: "2px 6px", color: cat.color, background: `${cat.color}1a`, marginBottom: "6px" }}>
          {cat.label}
        </span>
        <span style={{ display: "block", fontFamily: "var(--font-cormorant), Georgia, serif", fontSize: "14px", lineHeight: 1.55, color: "var(--text-secondary)", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
          {s.pre}
          {s.del && <del style={{ color: "#ef4444", background: "rgba(239,68,68,0.12)" }}>{visibleSpace(s.del)}</del>}
          {s.ins && <ins style={{ color: "#16a34a", background: "rgba(34,197,94,0.15)", textDecoration: "none", fontWeight: 600 }}>{visibleSpace(s.ins)}</ins>}
          {s.post}
        </span>
        <span style={{ display: "block", marginTop: "4px", fontSize: "11.5px", lineHeight: 1.5, color: "var(--text-muted)" }}>
          {s.stale ? "This text has changed since the check." : s.explanation}
        </span>
      </button>
      <div style={{ display: "flex", gap: "6px", padding: "0 10px 10px" }}>
        {!s.stale && (
          <button onClick={onAccept}
            style={{ ...font, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "5px 8px", fontSize: "12px", fontWeight: 600, cursor: "pointer", border: "1px solid rgba(34,197,94,0.5)", background: "rgba(34,197,94,0.1)", color: "#16a34a" }}>
            <Check style={{ width: "12px", height: "12px" }} /> Accept
          </button>
        )}
        <button onClick={onReject} title={s.stale ? "Remove" : "Reject and don't suggest this again"}
          style={{ ...font, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px", padding: "5px 8px", fontSize: "12px", cursor: "pointer", border: "1px solid var(--border-color)", background: "transparent", color: "var(--text-muted)" }}>
          <X style={{ width: "12px", height: "12px" }} /> {s.stale ? "Remove" : "Reject"}
        </button>
      </div>
    </div>
  );
}

// ── Panel ──────────────────────────────────────────────

export default function GrammarChecker({
  documentId, chapterId, chapterTitle, genre, editor, isOpen, onClose,
}: GrammarCheckerProps) {
  // Results are kept per chapter, so switching chapters and back keeps them.
  const [runs, setRuns] = useState<Record<string, ChapterRun>>({});
  const [ignored, setIgnored] = useState<Record<string, Set<string>>>({});
  const [filter, setFilter] = useState<ProofCategory | "all">("all");
  const [notice, setNotice] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const liveEditor = editor && !editor.isDestroyed ? editor : null;
  const run = chapterId ? runs[chapterId] : undefined;
  const ignoredHere = chapterId ? ignored[chapterId] : undefined;

  const updateRun = useCallback((id: string, update: (r: ChapterRun) => ChapterRun) => {
    setRuns((prev) => (prev[id] ? { ...prev, [id]: update(prev[id]) } : prev));
  }, []);

  // Word count for the button, and stale-marking when the text changes after a check.
  useEffect(() => {
    if (!liveEditor || !isOpen || !chapterId) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (liveEditor.isDestroyed) return;
        setWordCount(liveEditor.state.doc.textBetween(0, liveEditor.state.doc.content.size, " ", " ").split(/\s+/).filter(Boolean).length);
        const blocks = readBlocks(liveEditor.state.doc);
        updateRun(chapterId, (r) => {
          let changed = false;
          const suggestions = r.suggestions.map((s) => {
            const stale = !findIn(blocks, s);
            if (stale !== !!s.stale) changed = true;
            return stale === !!s.stale ? s : { ...s, stale };
          });
          return changed ? { ...r, suggestions } : r;
        });
      }, 400);
    };
    refresh();
    liveEditor.on("update", refresh);
    return () => { clearTimeout(timer); liveEditor.off("update", refresh); };
  }, [liveEditor, isOpen, chapterId, updateRun]);

  const loadIgnored = async (id: string): Promise<Set<string>> => {
    const res = await fetch(`/api/documents/${documentId}/proofread/ignores?chapterId=${id}`);
    const keys = res.ok ? new Set(((await res.json()) as { keys: string[] }).keys) : new Set<string>();
    setIgnored((prev) => ({ ...prev, [id]: keys }));
    return keys;
  };

  const start = async () => {
    if (!liveEditor || !chapterId) return;
    const id = chapterId;
    setNotice(null);
    setFilter("all");
    // Snapshot the text now: results are matched against it even if the author
    // keeps typing or switches chapters while the check runs.
    const blocks = readBlocks(liveEditor.state.doc).filter((b) => b.text.trim());
    const snapshot = new Map(blocks.map((b) => [b.n, b.text]));
    const sections = sectionsOf(blocks.map(({ n, text }) => ({ n, text })));
    if (!sections.length) {
      setNotice("This chapter has no text yet.");
      return;
    }
    setRuns((prev) => ({ ...prev, [id]: { status: "running", total: sections.length, finished: 0, failed: 0, suggestions: [] } }));
    const ignoredKeys = await loadIgnored(id).catch(() => new Set<string>());
    const seen = new Set<string>();
    let counter = 0;

    const toSuggestion = (raw: RawSuggestion): Suggestion | null => {
      const text = snapshot.get(raw.paragraph);
      const edit = text !== undefined ? editFor(text, raw.original, raw.replacement) : null;
      if (!text || !edit) return null;
      const key = editKey(text, edit);
      if (ignoredKeys.has(key) || seen.has(key)) return null;
      seen.add(key);
      counter += 1;
      return {
        ...raw,
        id: `${id}-${counter}`,
        key,
        ...preview(text, edit),
      };
    };

    const checkSection = async (paragraphs: ProofParagraph[]) => {
      try {
        const res = await fetch(`/api/documents/${documentId}/proofread`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chapterId: id, chapterTitle, genre: genre ?? null, paragraphs }),
        });
        const body = (await res.json().catch(() => ({}))) as { suggestions?: RawSuggestion[]; error?: string };
        if (!res.ok) throw new Error(body.error ?? "Couldn't check this section.");
        const found = (body.suggestions ?? []).map(toSuggestion).filter((s): s is Suggestion => s !== null);
        updateRun(id, (r) => ({
          ...r,
          finished: r.finished + 1,
          // Keep suggestions in reading order.
          suggestions: [...r.suggestions, ...found].sort((a, b) => a.paragraph - b.paragraph),
        }));
      } catch (err) {
        updateRun(id, (r) => ({ ...r, finished: r.finished + 1, failed: r.failed + 1, error: (err as Error).message }));
      }
    };

    const queue = [...sections];
    await Promise.all(Array.from({ length: Math.min(PARALLEL, queue.length) }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) await checkSection(next);
    }));
    updateRun(id, (r) => ({ ...r, status: "done" }));
  };

  const remove = (ids: Set<string>) => {
    if (!chapterId) return;
    updateRun(chapterId, (r) => ({ ...r, suggestions: r.suggestions.filter((s) => !ids.has(s.id)) }));
  };

  const accept = (targets: Suggestion[]) => {
    if (!liveEditor || !chapterId) return;
    const applied = new Set<string>();
    const stale = new Set<string>();
    // One transaction, so a single undo reverts an "Accept all".
    liveEditor.chain().command(({ tr }) => {
      for (const s of targets) {
        const found = findInDoc(tr.doc, s);
        if (!found) { stale.add(s.id); continue; }
        applyEdit(tr, found.block, found.edit);
        applied.add(s.id);
      }
      return applied.size > 0;
    }).run();
    updateRun(chapterId, (r) => ({
      ...r,
      suggestions: r.suggestions
        .filter((s) => !applied.has(s.id))
        .map((s) => (stale.has(s.id) ? { ...s, stale: true } : s)),
    }));
  };

  const reject = async (s: Suggestion) => {
    if (!chapterId) return;
    remove(new Set([s.id]));
    if (s.stale) return;
    setIgnored((prev) => ({ ...prev, [chapterId]: new Set([...(prev[chapterId] ?? []), s.key]) }));
    const res = await fetch(`/api/documents/${documentId}/proofread/ignores`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, key: s.key, original: s.original, replacement: s.replacement }),
    }).catch(() => null);
    if (!res?.ok) setNotice("Couldn't save that rejection, so it may be suggested again.");
  };

  const resetIgnored = async () => {
    if (!chapterId) return;
    const res = await fetch(`/api/documents/${documentId}/proofread/ignores?chapterId=${chapterId}`, { method: "DELETE" });
    if (res.ok) {
      setIgnored((prev) => ({ ...prev, [chapterId]: new Set() }));
      setNotice("Rejected suggestions can come back on the next check.");
    }
  };

  const show = (s: Suggestion) => {
    if (!liveEditor) return;
    const found = findInDoc(liveEditor.state.doc, s);
    if (!found) return;
    const from = found.block.pos + 1 + found.edit.from;
    const to = found.block.pos + 1 + Math.max(found.edit.to, found.edit.from);
    liveEditor.chain().focus().setTextSelection({ from, to }).scrollIntoView().run();
    const dom = liveEditor.view.domAtPos(from).node;
    (dom instanceof HTMLElement ? dom : dom.parentElement)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const suggestions = useMemo(() => run?.suggestions ?? [], [run]);
  const counts = useMemo(() => {
    const c: Partial<Record<ProofCategory, number>> = {};
    suggestions.forEach((s) => { c[s.category] = (c[s.category] ?? 0) + 1; });
    return c;
  }, [suggestions]);
  const visible = suggestions.filter((s) => filter === "all" || s.category === filter);
  const acceptable = visible.filter((s) => !s.stale);
  const running = run?.status === "running";

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
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px", height: "48px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
              <BookCheck style={{ width: "14px", height: "14px", color: "var(--gold-primary)", flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Proofreader</span>
                {chapterId && (
                  <p style={{ ...font, fontSize: "10px", color: "var(--text-muted)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {chapterTitle || "Untitled"}
                  </p>
                )}
              </div>
            </div>
            <button onClick={onClose} style={iconButton} title="Close"><X style={{ width: "14px", height: "14px" }} /></button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
            {!liveEditor || !chapterId ? (
              <p style={{ ...font, fontSize: "12px", color: "var(--text-dim)", lineHeight: 1.6 }}>Open a chapter in the editor to proofread it.</p>
            ) : (
              <>
                {/* Run */}
                {!run && (
                  <p style={{ ...font, fontSize: "12px", lineHeight: 1.65, color: "var(--text-muted)", margin: "0 0 12px" }}>
                    Reads the whole chapter for grammar, spelling, punctuation, spacing, missing words and repeated words.
                    Accept a fix to make the change, or reject it and it won&apos;t be suggested again.
                  </p>
                )}
                <button onClick={() => void start()} disabled={running} className="btn-gold"
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", width: "100%", padding: "8px 12px", fontSize: "12.5px", cursor: running ? "default" : "pointer", opacity: running ? 0.7 : 1 }}>
                  {running ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <BookCheck style={{ width: "13px", height: "13px" }} />}
                  {running ? "Proofreading…" : run ? "Check again" : `Proofread chapter${wordCount ? ` (${wordCount.toLocaleString()} words)` : ""}`}
                </button>
                {run && running && (
                  <div style={{ marginTop: "10px" }}>
                    <div style={{ height: "3px", background: "var(--border-color)" }}>
                      <motion.div animate={{ width: `${Math.max(6, (run.finished / run.total) * 100)}%` }} style={{ height: "100%", background: "var(--gold-primary)" }} />
                    </div>
                    <p style={{ ...font, fontSize: "11px", color: "var(--text-dim)", margin: "4px 0 0" }}>
                      Checked {run.finished} of {run.total} {run.total === 1 ? "section" : "sections"}. Suggestions appear as each one finishes.
                    </p>
                  </div>
                )}
                {run?.failed ? (
                  <p style={{ ...font, fontSize: "11.5px", color: "#ef4444", margin: "8px 0 0" }}>
                    {run.failed} of {run.total} {run.total === 1 ? "section" : "sections"} couldn&apos;t be checked: {run.error}
                  </p>
                ) : null}
                {notice && <p style={{ ...font, fontSize: "11.5px", color: "var(--text-muted)", margin: "8px 0 0" }}>{notice}</p>}

                {/* Results */}
                {run && (
                  <div style={{ marginTop: "14px" }}>
                    {suggestions.length > 0 ? (
                      <>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "10px" }}>
                          {[{ key: "all" as const, label: "All", count: suggestions.length }, ...PROOF_CATEGORIES.filter((c) => counts[c.key]).map((c) => ({ key: c.key, label: c.label, count: counts[c.key]! }))].map((f) => (
                            <button key={f.key} onClick={() => setFilter(f.key)}
                              style={{ ...font, padding: "3px 8px", fontSize: "11px", cursor: "pointer", border: "1px solid var(--border-color)", background: filter === f.key ? "var(--bg-elevated)" : "transparent", color: filter === f.key ? "var(--text-primary)" : "var(--text-muted)" }}>
                              {f.label} ({f.count})
                            </button>
                          ))}
                        </div>
                        {acceptable.length > 1 && (
                          <button onClick={() => accept(acceptable)}
                            style={{ ...font, display: "flex", alignItems: "center", gap: "5px", marginBottom: "10px", padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: 600, color: "var(--gold-primary)" }}>
                            <CheckCheck style={{ width: "13px", height: "13px" }} />
                            Accept all {acceptable.length}{filter === "all" ? "" : ` ${CATEGORY[filter].label.toLowerCase()}`} fixes
                          </button>
                        )}
                        {visible.map((s) => (
                          <SuggestionCard key={s.id} s={s}
                            onAccept={() => accept([s])}
                            onReject={() => void reject(s)}
                            onShow={() => show(s)} />
                        ))}
                      </>
                    ) : running ? null : (
                      <p style={{ ...font, fontSize: "12.5px", color: "var(--text-muted)", textAlign: "center", padding: "16px 0" }}>
                        {run.failed === run.total ? "" : "All clear. Nothing left to fix in this chapter."}
                      </p>
                    )}
                  </div>
                )}

                {ignoredHere && ignoredHere.size > 0 && !running && (
                  <p style={{ ...font, fontSize: "11px", color: "var(--text-dim)", margin: "12px 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
                    {ignoredHere.size} rejected {ignoredHere.size === 1 ? "suggestion is" : "suggestions are"} hidden.
                    <button onClick={() => void resetIgnored()} title="Let rejected suggestions come back"
                      style={{ ...font, display: "inline-flex", alignItems: "center", gap: "3px", padding: 0, background: "none", border: "none", cursor: "pointer", fontSize: "11px", color: "var(--text-muted)", textDecoration: "underline" }}>
                      <RotateCcw style={{ width: "10px", height: "10px" }} /> Reset
                    </button>
                  </p>
                )}
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
