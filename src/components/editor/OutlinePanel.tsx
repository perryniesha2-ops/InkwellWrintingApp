"use client;";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface Heading {
  id: string;
  level: number;
  text: string;
  pos: number;
}

interface OutlinePanelProps {
  editor: Editor | null;
  isOpen: boolean;
  onToggle: () => void;
}

function extractHeadings(editor: Editor): Heading[] {
  const headings: Heading[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === "heading") {
      headings.push({
        id: `heading-${pos}`,
        level: node.attrs.level as number,
        text: node.textContent,
        pos,
      });
    }
  });
  return headings;
}

export default function OutlinePanel({
  editor,
  isOpen,
  onToggle,
}: OutlinePanelProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activePos, setActivePos] = useState<number | null>(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => setHeadings(extractHeadings(editor));
    update();
    editor.on("update", update);
    return () => {
      editor.off("update", update);
    };
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const updateActive = () => {
      const { from } = editor.state.selection;
      const hs = extractHeadings(editor);
      let active = hs[0]?.pos ?? null;
      for (const h of hs) {
        if (h.pos <= from) active = h.pos;
      }
      setActivePos(active);
    };
    editor.on("selectionUpdate", updateActive);
    return () => {
      editor.off("selectionUpdate", updateActive);
    };
  }, [editor]);

  const scrollToHeading = (pos: number, index: number) => {
    if (!editor || editor.isDestroyed) return;

    setActivePos(pos);

    try {
      editor
        .chain()
        .focus()
        .setTextSelection(pos + 1)
        .run();
    } catch {
      return;
    }

    setTimeout(() => {
      const container = document.getElementById("editor-scroll-container");
      const domHeadings = container?.querySelectorAll("h1, h2, h3");
      const target = domHeadings?.[index] as HTMLElement | undefined;
      if (target && container) {
        const containerTop = container.getBoundingClientRect().top;
        const targetTop = target.getBoundingClientRect().top;
        const offset = targetTop - containerTop + container.scrollTop - 40;
        container.scrollTo({ top: offset, behavior: "smooth" });
      }
    }, 50);
  };

  const indentMap: Record<number, string> = { 1: "pl-0", 2: "pl-3", 3: "pl-6" };
  const sizeMap: Record<number, string> = {
    1: "text-sm font-semibold",
    2: "text-xs font-medium",
    3: "text-xs font-normal",
  };

  return (
    <div className="relative flex h-full flex-shrink-0">
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 220, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            style={{ borderRight: "1px solid hsl(var(--border))" }}
          >
            <div
              className="w-[220px] h-full flex flex-col"
              style={{ background: "var(--bg-surface)" }}
            >
              {/* Header */}
              <div
                className="flex items-center gap-2 px-4 py-3 flex-shrink-0"
                style={{ borderBottom: "1px solid hsl(var(--border))" }}
              >
                <span
                  className="font-sans text-xs font-medium uppercase tracking-widest"
                  style={{ color: "var(--text-muted)" }}
                >
                  Outline
                </span>
              </div>

              {/* Headings list */}
              <div className="flex-1 overflow-y-auto py-3 px-2">
                {headings.length === 0 ? (
                  <div className="px-3 py-6 text-center">
                    <p
                      className="font-sans text-xs italic leading-relaxed"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Add headings to build an outline.
                    </p>
                    <p
                      className="font-sans text-xs mt-2"
                      style={{ color: "var(--text-dim)" }}
                    >
                      Use H1 for chapters, H2 for scenes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {headings.map((h, index) => (
                      <button
                        key={h.id}
                        onClick={() => scrollToHeading(h.pos, index)}
                        className={`w-full text-left px-3 py-2 rounded-md transition-all ${indentMap[h.level] ?? "pl-0"} ${sizeMap[h.level] ?? "text-xs"}`}
                        style={
                          activePos === h.pos
                            ? {
                                background: "var(--gold-subtle)",
                                color: "var(--gold-light)",
                                borderLeft: "2px solid var(--gold-primary)",
                              }
                            : {
                                color: "var(--text-muted)",
                                borderLeft: "2px solid transparent",
                              }
                        }
                      >
                        <span className="block truncate w-full">
                          {h.text || "(untitled)"}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {headings.length > 0 && (
                <div
                  className="px-4 py-2 flex-shrink-0"
                  style={{ borderTop: "1px solid hsl(var(--border))" }}
                >
                  <p
                    className="text-xs font-sans"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {headings.filter((h) => h.level === 1).length} chapter
                    {headings.filter((h) => h.level === 1).length !== 1
                      ? "s"
                      : ""}
                    {headings.filter((h) => h.level === 2).length > 0 &&
                      ` · ${headings.filter((h) => h.level === 2).length} scene${headings.filter((h) => h.level === 2).length !== 1 ? "s" : ""}`}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute top-6 z-10 w-6 h-6 rounded-full flex items-center justify-center shadow-md transition-all flex-shrink-0"
        style={{
          left: isOpen ? 207 : 4,
          background: "var(--gold-primary)",
          color: "var(--bg-primary)",
          border: "2px solid var(--bg-surface)",
          transition: "left 0.3s ease",
        }}
        title={isOpen ? "Close outline" : "Open outline"}
      >
        {isOpen ? (
          <ChevronLeft className="w-3 h-3" />
        ) : (
          <ChevronRight className="w-3 h-3" />
        )}
      </button>
    </div>
  );
}
