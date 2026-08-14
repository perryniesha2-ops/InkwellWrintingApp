"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, BookOpen, FileText,
  Pin, PinOff, Loader2, MapPin,
} from "lucide-react";
import type { Editor } from "@tiptap/react";

interface DocHeading {
  level: number;
  text: string;
  pos: number;
}

interface OutlineSection {
  id: string;
  title: string;
  type: string | null;
  order_index: number | null;
  content: string | null;
  pov_character: string | null;
  emotional_start: string | null;
  emotional_end: string | null;
  key_events: string | null;
  location: string | null;
}

interface OutlinePanelProps {
  editor: Editor | null;
  isOpen: boolean;
  onToggle: () => void;
  documentId?: string;
}

export default function OutlinePanel({
  editor, isOpen, onToggle, documentId,
}: OutlinePanelProps) {
  const [tab, setTab] = useState<"document" | "plan">("document");
  const [pinned, setPinned] = useState(false);
  const [headings, setHeadings] = useState<DocHeading[]>([]);
  const [sections, setSections] = useState<OutlineSection[]>([]);
  const [loadingSections, setLoadingSections] = useState(false);
  const [activeHeadingPos, setActiveHeadingPos] = useState<number>(0);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  // Extract headings from editor
  const extractHeadings = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const found: DocHeading[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        found.push({
          level: node.attrs.level as number,
          text: node.textContent,
          pos,
        });
      }
    });
    setHeadings(found);
  }, [editor]);

  // Track cursor position
  const updateActiveHeading = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const cursorPos = editor.state.selection.from;
    let active = 0;
    for (const h of headings) {
      if (cursorPos >= h.pos) active = h.pos;
    }
    setActiveHeadingPos(active);
  }, [editor, headings]);

 // Replace the useEffect that sets up editor listeners with:
useEffect(() => {
  if (!editor) return;

  // Subscribe to events — these call setState in callbacks (correct pattern)
  editor.on("update", extractHeadings);
  editor.on("selectionUpdate", updateActiveHeading);

  // Initial extraction via setTimeout so it's not synchronous in the effect body
  const timer = setTimeout(() => {
    extractHeadings();
  }, 0);

  return () => {
    clearTimeout(timer);
    editor.off("update", extractHeadings);
    editor.off("selectionUpdate", updateActiveHeading);
  };
}, [editor, extractHeadings, updateActiveHeading]);

  // Load Story Bible outline
  useEffect(() => {
  if (!documentId || tab !== "plan") return;

  let cancelled = false;

  const load = async () => {
    await Promise.resolve(); // defer to next tick
    if (cancelled) return;

    setLoadingSections(true);
    try {
      const r = await fetch(`/api/bible/${documentId}`);
      const data = await r.json() as { outline: OutlineSection[] };
      if (!cancelled) setSections(data.outline ?? []);
    } catch {
      if (!cancelled) setSections([]);
    } finally {
      if (!cancelled) setLoadingSections(false);
    }
  };

  void load();

  return () => { cancelled = true; };
}, [documentId, tab]);

  const jumpToHeading = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos).run();
    setTimeout(() => {
      const container = document.getElementById("editor-scroll-container");
      if (!container) return;
      try {
        const { node } = editor.view.domAtPos(pos + 1);
        const el = (node.nodeType === 1 ? node : (node as HTMLElement).parentElement) as HTMLElement;
        if (el) {
          const containerRect = container.getBoundingClientRect();
          const targetRect = el.getBoundingClientRect();
          const scrollTop = container.scrollTop + (targetRect.top - containerRect.top) - 80;
          container.scrollTo({ top: scrollTop, behavior: "smooth" });
        }
      } catch { /* ignore */ }
    }, 50);
  };

  const panelWidth = pinned ? 240 : 220;

  return (
    <>
      {/* Toggle button when closed */}
      <AnimatePresence>
        {!isOpen && !pinned && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            style={{
              position: "fixed", left: 0, top: "50%",
              transform: "translateY(-50%)",
              width: "20px", height: "48px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              borderLeft: "none",
              color: "var(--text-dim)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 30,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
            <ChevronRight style={{ width: "12px", height: "12px" }} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {(isOpen || pinned) && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: panelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            style={{
              flexShrink: 0, height: "100%",
              borderRight: "1px solid var(--border-color)",
              background: "var(--bg-surface)",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
            }}>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "0 10px", height: "40px", flexShrink: 0,
              borderBottom: "1px solid var(--border-color)",
            }}>
              {/* Tab toggle */}
              <div style={{ display: "flex", gap: "2px" }}>
                <button
                  onClick={() => setTab("document")}
                  title="Document headings"
                  style={{
                    padding: "4px 8px", fontSize: "10px",
                    fontFamily: "var(--font-inter)", fontWeight: 600,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: tab === "document" ? "var(--gold-subtle)" : "transparent",
                    color: tab === "document" ? "var(--gold-primary)" : "var(--text-dim)",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}>
                  <FileText style={{ width: "11px", height: "11px" }} />
                  Doc
                </button>
                <button
                  onClick={() => setTab("plan")}
                  title="Story Bible outline"
                  style={{
                    padding: "4px 8px", fontSize: "10px",
                    fontFamily: "var(--font-inter)", fontWeight: 600,
                    letterSpacing: "0.06em", textTransform: "uppercase",
                    border: "none", cursor: "pointer", transition: "all 0.15s",
                    background: tab === "plan" ? "var(--gold-subtle)" : "transparent",
                    color: tab === "plan" ? "var(--gold-primary)" : "var(--text-dim)",
                    display: "flex", alignItems: "center", gap: "4px",
                  }}>
                  <BookOpen style={{ width: "11px", height: "11px" }} />
                  Plan
                </button>
              </div>

              {/* Pin + close */}
              <div style={{ display: "flex", gap: "4px" }}>
                <button
                  onClick={() => setPinned((p) => !p)}
                  title={pinned ? "Unpin panel" : "Pin panel open"}
                  style={{
                    color: pinned ? "var(--gold-primary)" : "var(--text-dim)",
                    background: pinned ? "var(--gold-subtle)" : "none",
                    border: "none", cursor: "pointer", display: "flex", padding: "4px",
                  }}
                  onMouseEnter={(e) => { if (!pinned) (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { if (!pinned) (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
                  {pinned
                    ? <PinOff style={{ width: "12px", height: "12px" }} />
                    : <Pin style={{ width: "12px", height: "12px" }} />}
                </button>
                {!pinned && (
                  <button
                    onClick={onToggle}
                    style={{ color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
                    <ChevronLeft style={{ width: "12px", height: "12px" }} />
                  </button>
                )}
              </div>
            </div>

            {/* Content */}
            <div style={{ flex: 1, overflowY: "auto" }}>

              {/* Document tab — headings from editor */}
              {tab === "document" && (
                <div style={{ padding: "8px 0" }}>
                  {headings.length === 0 ? (
                    <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", fontStyle: "italic", padding: "12px 12px", margin: 0 }}>
                      Add H1 headings to your document to see them here.
                    </p>
                  ) : (
                    headings.map((h, i) => (
                      <button
                        key={i}
                        onClick={() => jumpToHeading(h.pos)}
                        style={{
                          width: "100%", textAlign: "left",
                          padding: `5px ${h.level === 1 ? "10px" : h.level === 2 ? "18px" : "26px"}`,
                          background: activeHeadingPos === h.pos ? "var(--gold-subtle)" : "transparent",
                          borderLeft: activeHeadingPos === h.pos ? "2px solid var(--gold-primary)" : "2px solid transparent",
                          border: "none", cursor: "pointer", transition: "all 0.15s",
                          display: "flex", alignItems: "center", gap: "6px",
                        }}
                        onMouseEnter={(e) => {
                          if (activeHeadingPos !== h.pos)
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          if (activeHeadingPos !== h.pos)
                            (e.currentTarget as HTMLElement).style.background = "transparent";
                        }}>
                        {activeHeadingPos === h.pos && (
                          <MapPin style={{ width: "10px", height: "10px", color: "var(--gold-primary)", flexShrink: 0 }} />
                        )}
                        <span style={{
                          fontSize: h.level === 1 ? "12px" : "11px",
                          fontFamily: h.level === 1 ? "var(--font-dm-sans)" : "var(--font-inter)",
                          fontWeight: h.level === 1 ? 700 : 400,
                          color: activeHeadingPos === h.pos ? "var(--gold-primary)" : "var(--text-muted)",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          letterSpacing: h.level === 1 ? "-0.01em" : "0",
                        }}>
                          {h.text || "Untitled"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Plan tab — Story Bible outline */}
              {tab === "plan" && (
                <div style={{ padding: "8px 0" }}>
                  {loadingSections ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "24px" }}>
                      <Loader2 style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} className="animate-spin" />
                    </div>
                  ) : sections.length === 0 ? (
                    <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", fontStyle: "italic", padding: "12px", margin: 0 }}>
                      No outline sections yet. Add them in the Story Bible.
                    </p>
                  ) : (
                    sections
                      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
                      .map((section) => (
                        <div key={section.id}>
                          {/* Section header */}
                          <button
                            onClick={() => setExpandedSection(
                              expandedSection === section.id ? null : section.id
                            )}
                            style={{
                              width: "100%", textAlign: "left",
                              padding: "8px 10px",
                              background: expandedSection === section.id ? "var(--gold-subtle)" : "transparent",
                              borderLeft: expandedSection === section.id ? "2px solid var(--gold-primary)" : "2px solid transparent",
                              border: "none", cursor: "pointer", transition: "all 0.15s",
                            }}
                            onMouseEnter={(e) => {
                              if (expandedSection !== section.id)
                                (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                            }}
                            onMouseLeave={(e) => {
                              if (expandedSection !== section.id)
                                (e.currentTarget as HTMLElement).style.background = "transparent";
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", flexShrink: 0 }}>
                                {(section.order_index ?? 0) + 1}
                              </span>
                              <span style={{ fontSize: "12px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, color: expandedSection === section.id ? "var(--gold-primary)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                                {section.title || "Untitled"}
                              </span>
                            </div>
                            {section.type && (
                              <span style={{ fontSize: "9px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginLeft: "16px" }}>
                                {section.type}
                              </span>
                            )}
                          </button>

                          {/* Expanded details */}
                          <AnimatePresence>
                            {expandedSection === section.id && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                style={{ overflow: "hidden" }}>
                                <div style={{ padding: "8px 10px 10px 18px", borderBottom: "1px solid var(--border-color)", display: "flex", flexDirection: "column", gap: "8px" }}>

                                  {section.pov_character && (
                                    <div>
                                      <p style={{ fontSize: "9px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 2px" }}>POV</p>
                                      <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", margin: 0 }}>{section.pov_character}</p>
                                    </div>
                                  )}

                                  {section.location && (
                                    <div>
                                      <p style={{ fontSize: "9px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 2px" }}>Location</p>
                                      <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", margin: 0 }}>{section.location}</p>
                                    </div>
                                  )}

                                  {section.content && (
                                    <div>
                                      <p style={{ fontSize: "9px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 2px" }}>Summary</p>
                                      <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                                        {section.content.slice(0, 120)}{section.content.length > 120 ? "…" : ""}
                                      </p>
                                    </div>
                                  )}

                                  {section.key_events && (
                                    <div>
                                      <p style={{ fontSize: "9px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 2px" }}>Key Events</p>
                                      <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                                        {section.key_events.slice(0, 120)}{section.key_events.length > 120 ? "…" : ""}
                                      </p>
                                    </div>
                                  )}

                                  {(section.emotional_start || section.emotional_end) && (
                                    <div>
                                      <p style={{ fontSize: "9px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 4px" }}>Emotional Arc</p>
                                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        {section.emotional_start && (
                                          <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", padding: "2px 6px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)" }}>
                                            {section.emotional_start.slice(0, 20)}
                                          </span>
                                        )}
                                        {section.emotional_start && section.emotional_end && (
                                          <span style={{ fontSize: "10px", color: "var(--text-dim)" }}>→</span>
                                        )}
                                        {section.emotional_end && (
                                          <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", padding: "2px 6px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)" }}>
                                            {section.emotional_end.slice(0, 20)}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* Jump to matching heading in editor */}
                                  {(() => {
                                    const match = headings.find((h) =>
                                      h.text.toLowerCase().includes(section.title.toLowerCase()) ||
                                      section.title.toLowerCase().includes(h.text.toLowerCase())
                                    );
                                    return match ? (
                                      <button
                                        onClick={() => jumpToHeading(match.pos)}
                                        style={{
                                          display: "flex", alignItems: "center", gap: "4px",
                                          padding: "4px 8px", fontSize: "10px",
                                          fontFamily: "var(--font-inter)", fontWeight: 600,
                                          background: "var(--gold-subtle)",
                                          color: "var(--gold-primary)",
                                          border: "1px solid var(--gold-border)",
                                          cursor: "pointer", alignSelf: "flex-start",
                                        }}>
                                        <MapPin style={{ width: "10px", height: "10px" }} />
                                        Go to chapter
                                      </button>
                                    ) : null;
                                  })()}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}