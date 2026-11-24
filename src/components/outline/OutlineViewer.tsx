"use client";

import { useEffect, useMemo, useRef } from "react";
import { Crosshair } from "lucide-react";
import { headingForChapter, outlineHeadings, sanitizeOutlineHtml } from "@/lib/outlineDocs";

interface OutlineViewerProps {
  /** The outline's HTML as stored; it's sanitized here before it's shown. */
  html: string;
  /** The chapter open in the editor, to offer (and jump to) its part of the outline. */
  chapterTitle?: string;
  /** Scroll to the open chapter's part of the outline when it's first shown. */
  jumpToChapter?: boolean;
  /** Smaller type for the editor's side panel. */
  compact?: boolean;
}

const STYLES = `
.outline-doc { color: var(--text-secondary); font-family: var(--font-inter); line-height: 1.65; overflow-wrap: anywhere; }
.outline-doc > :first-child { margin-top: 0; }
.outline-doc h1, .outline-doc h2, .outline-doc h3, .outline-doc h4, .outline-doc h5, .outline-doc h6 {
  font-family: var(--font-dm-sans); color: var(--text-primary); letter-spacing: -0.01em; line-height: 1.3;
  margin: 1.4em 0 0.5em; scroll-margin-top: 12px; transition: background 0.6s;
}
.outline-doc h1 { font-size: 1.35em; font-weight: 800; }
.outline-doc h2 { font-size: 1.18em; font-weight: 700; }
.outline-doc h3 { font-size: 1.05em; font-weight: 700; }
.outline-doc h4, .outline-doc h5, .outline-doc h6 { font-size: 1em; font-weight: 600; }
.outline-doc p { margin: 0 0 0.7em; }
.outline-doc ul, .outline-doc ol { margin: 0 0 0.8em; padding-left: 1.4em; }
.outline-doc li { margin: 0.15em 0; }
.outline-doc li > p { margin: 0; }
.outline-doc blockquote { margin: 0 0 0.8em; padding-left: 0.9em; border-left: 2px solid var(--gold-border); color: var(--text-muted); }
.outline-doc hr { border: none; border-top: 1px solid var(--border-color); margin: 1.2em 0; }
.outline-doc a { color: var(--gold-primary); }
.outline-doc table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; margin: 0 0 1em; }
.outline-doc td, .outline-doc th { border: 1px solid var(--border-color); padding: 4px 8px; vertical-align: top; text-align: left; min-width: 6em; }
.outline-doc th { color: var(--text-primary); background: var(--bg-elevated); }
.outline-doc td > p, .outline-doc th > p { margin: 0 0 0.3em; }
.outline-doc .outline-flash { background: var(--gold-subtle); }
`;

/** Scroll a heading (by its position among the h1–h4s) into view and flash it. */
function scrollToHeading(container: HTMLElement | null, index: number, smooth: boolean) {
  const el = container?.querySelectorAll("h1, h2, h3, h4")[index];
  if (!el) return;
  el.scrollIntoView({ block: "start", behavior: smooth ? "smooth" : "auto" });
  el.classList.add("outline-flash");
  setTimeout(() => el.classList.remove("outline-flash"), 1200);
}

/** Indent for nested headings in the jump menu (an em space; options can't hold markup). */
const INDENT = String.fromCharCode(0x2003);

export default function OutlineViewer({ html, chapterTitle = "", jumpToChapter = false, compact = false }: OutlineViewerProps) {
  const body = useRef<HTMLDivElement>(null);
  const safe = useMemo(() => sanitizeOutlineHtml(html), [html]);
  const headings = useMemo(() => outlineHeadings(safe), [safe]);
  const chapterHeading = chapterTitle ? headingForChapter(headings, chapterTitle) : null;
  const topLevel = Math.min(...headings.map((h) => h.level));

  const jumpTo = (index: number) => scrollToHeading(body.current, index, true);

  // Open at the chapter being written, once per outline shown.
  const jumpIndex = jumpToChapter ? chapterHeading?.index ?? null : null;
  const jumped = useRef<string | null>(null);
  useEffect(() => {
    if (jumpIndex === null || jumped.current === safe) return;
    jumped.current = safe;
    scrollToHeading(body.current, jumpIndex, false);
  }, [jumpIndex, safe]);

  const control: React.CSSProperties = {
    fontSize: "11.5px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)",
    background: "var(--bg-primary)", border: "1px solid var(--border-color)", padding: "5px 8px", outline: "none",
  };

  return (
    <div>
      <style>{STYLES}</style>
      {headings.length > 1 && (
        <div style={{ display: "flex", gap: "6px", marginBottom: "14px" }}>
          <select
            aria-label="Jump to a section of the outline"
            value=""
            onChange={(e) => {
              if (e.target.value !== "") jumpTo(Number(e.target.value));
            }}
            style={{ ...control, flex: 1, minWidth: 0, cursor: "pointer" }}>
            <option value="">Jump to…</option>
            {headings.map((h) => (
              <option key={h.index} value={h.index}>
                {INDENT.repeat(h.level - topLevel)}
                {h.text.length > 70 ? `${h.text.slice(0, 70)}…` : h.text || "(untitled)"}
              </option>
            ))}
          </select>
          {chapterHeading && (
            <button
              onClick={() => jumpTo(chapterHeading.index)}
              title={`Jump to “${chapterHeading.text}”`}
              style={{ ...control, display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", flexShrink: 0, color: "var(--gold-primary)", borderColor: "var(--gold-border)" }}>
              <Crosshair style={{ width: "11px", height: "11px" }} /> This chapter
            </button>
          )}
        </div>
      )}
      <div
        ref={body}
        className="outline-doc"
        style={{ fontSize: compact ? "13px" : "15px" }}
        dangerouslySetInnerHTML={{ __html: safe }}
      />
    </div>
  );
}
