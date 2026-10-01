"use client";

import { useState } from "react";
import { GripHorizontal, LayoutList, Lightbulb, PenLine, Plus } from "lucide-react";
import {
  buildChapterTree, countWords, moveChapter,
  type Chapter, type DropPosition,
} from "@/lib/chapters";

interface CorkboardProps {
  chapters: Chapter[];
  activeChapterId: string | null;
  onOpen: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onSynopsisChange: (id: string, synopsis: string) => void;
  onMove: (dragId: string, targetId: string, position: DropPosition) => void;
  onAdd: (parentId: string | null) => void;
  onOpenTemplates: () => void;
  /** False for collaborators limited to certain chapters: no add/move. */
  canEditStructure: boolean;
}

const LANE_WIDTH = 248;

function IndexCard({
  chapter, isChapter, active, dropEdge, draggable, onDragStart, onDragEnd, onOpen, onRename, onSynopsisChange,
}: {
  chapter: Chapter;
  isChapter: boolean;
  active: boolean;
  dropEdge: DropPosition | null;
  draggable: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onOpen: () => void;
  onRename: (title: string) => void;
  onSynopsisChange: (synopsis: string) => void;
}) {
  const words = countWords(chapter.content);
  const edgeShadow = {
    before: isChapter ? "-3px 0 0 var(--gold-primary)" : "0 -3px 0 var(--gold-primary)",
    after: isChapter ? "3px 0 0 var(--gold-primary)" : "0 3px 0 var(--gold-primary)",
    inside: "0 0 0 2px var(--gold-primary)",
  };

  return (
    <div
      data-card
      style={{
        position: "relative", background: "var(--bg-surface)",
        border: `1px solid ${active ? "var(--gold-border)" : "var(--border-color)"}`,
        borderTop: `3px solid ${isChapter ? "var(--gold-primary)" : "var(--border-color)"}`,
        boxShadow: `${dropEdge ? edgeShadow[dropEdge] + ", " : ""}0 2px 6px rgba(0,0,0,0.18)`,
        display: "flex", flexDirection: "column",
      }}>
      {/* Drag handle + pin */}
      <div
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        title={draggable ? "Drag to rearrange" : undefined}
        style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "16px", cursor: draggable ? "grab" : "default", color: "var(--text-dim)" }}>
        {draggable && <GripHorizontal style={{ width: "14px", height: "14px" }} />}
      </div>
      <div style={{ padding: "0 12px 10px", display: "flex", flexDirection: "column", gap: "6px" }}>
        <input
          key={`t-${chapter.title}`}
          defaultValue={chapter.title}
          onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== chapter.title) onRename(v); }}
          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
          style={{
            width: "100%", background: "transparent", border: "none", outline: "none", padding: 0,
            fontFamily: "var(--font-dm-sans)", fontWeight: isChapter ? 700 : 600,
            fontSize: isChapter ? "14px" : "13px", color: "var(--text-primary)", letterSpacing: "-0.01em",
          }}
        />
        <textarea
          key={`s-${chapter.id}`}
          defaultValue={chapter.synopsis}
          placeholder={chapter.guidance || "Write a short synopsis: what happens, and why it matters…"}
          onBlur={(e) => { if (e.target.value !== chapter.synopsis) onSynopsisChange(e.target.value); }}
          rows={4}
          style={{
            width: "100%", resize: "vertical", background: "transparent", border: "none", outline: "none", padding: 0,
            fontFamily: "var(--font-inter)", fontSize: "12px", lineHeight: 1.55, color: "var(--text-secondary)",
            // Ruled index-card lines.
            backgroundImage: "repeating-linear-gradient(transparent, transparent 17.6px, var(--border-color) 17.6px, var(--border-color) 18.6px)",
            backgroundAttachment: "local",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontFamily: "var(--font-inter)", fontSize: "10.5px", color: "var(--text-dim)" }}>
            {words.toLocaleString()} words
            {chapter.guidance && chapter.synopsis && (
              <span title={chapter.guidance} style={{ display: "flex", color: "var(--gold-primary)" }}>
                <Lightbulb style={{ width: "11px", height: "11px" }} />
              </span>
            )}
          </span>
          <button
            onClick={onOpen}
            style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "11px", color: "var(--gold-primary)", padding: 0 }}>
            <PenLine style={{ width: "11px", height: "11px" }} /> Write
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Corkboard({
  chapters, activeChapterId, onOpen, onRename, onSynopsisChange, onMove, onAdd, onOpenTemplates, canEditStructure,
}: CorkboardProps) {
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);
  const tree = buildChapterTree(chapters);

  const startDrag = (id: string) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    const card = (e.currentTarget as HTMLElement).closest("[data-card]");
    if (card) e.dataTransfer.setDragImage(card, 20, 10);
    setDragId(id);
  };
  const endDrag = () => { setDragId(null); setDrop(null); };

  const hover = (e: React.DragEvent, targetId: string, candidates: DropPosition[]) => {
    if (!dragId) return;
    e.stopPropagation();
    const position = candidates.find((p) => moveChapter(chapters, dragId, targetId, p));
    if (!position) { if (drop) setDrop(null); return; }
    e.preventDefault();
    if (drop?.id !== targetId || drop.position !== position) setDrop({ id: targetId, position });
  };

  const commitDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragId && drop) onMove(dragId, drop.id, drop.position);
    endDrag();
  };

  const half = (e: React.DragEvent, axis: "x" | "y"): DropPosition => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return axis === "x"
      ? (e.clientX - r.left < r.width / 2 ? "before" : "after")
      : (e.clientY - r.top < r.height / 2 ? "before" : "after");
  };
  const draggingChapter = !!dragId && !chapters.find((c) => c.id === dragId)?.parent_id;
  const edgeFor = (id: string) => (drop?.id === id ? drop.position : null);

  return (
    <div style={{
      flex: 1, minHeight: 0, overflow: "auto",
      // Cork-ish dotted board.
      backgroundColor: "var(--bg-primary)",
      backgroundImage: "radial-gradient(var(--border-color) 1px, transparent 1px)",
      backgroundSize: "16px 16px",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "16px 24px 0", flexWrap: "wrap" }}>
        <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: "12px", color: "var(--text-dim)" }}>
          Drag cards by their handle to rearrange. Drop a scene on a chapter card to move it into that chapter.
        </p>
        {canEditStructure && <button
          onClick={onOpenTemplates}
          style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontFamily: "var(--font-inter)", fontSize: "12px", color: "var(--text-primary)", background: "var(--bg-surface)", border: "1px solid var(--border-color)", cursor: "pointer" }}>
          <LayoutList style={{ width: "13px", height: "13px", color: "var(--gold-primary)" }} /> Outline templates
        </button>}
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: "20px", padding: "16px 24px 32px", minWidth: "min-content" }}>
        {tree.map((node) => (
          <div
            key={node.id}
            // Empty space in a lane appends to that chapter.
            onDragOver={(e) => hover(e, node.id, draggingChapter ? [half(e, "x")] : ["inside"])}
            onDrop={commitDrop}
            style={{
              width: LANE_WIDTH, flexShrink: 0, display: "flex", flexDirection: "column", gap: "10px",
              padding: "6px", margin: "-6px",
              outline: drop?.id === node.id && drop.position === "inside" ? "1px dashed var(--gold-primary)" : "none",
              opacity: dragId === node.id ? 0.4 : 1,
            }}>
            <div onDragOver={(e) => hover(e, node.id, draggingChapter ? [half(e, "x")] : ["inside"])} onDrop={commitDrop}>
              <IndexCard
                chapter={node}
                isChapter
                active={node.id === activeChapterId}
                dropEdge={edgeFor(node.id)}
                draggable={canEditStructure}
                onDragStart={startDrag(node.id)}
                onDragEnd={endDrag}
                onOpen={() => onOpen(node.id)}
                onRename={(t) => onRename(node.id, t)}
                onSynopsisChange={(s) => onSynopsisChange(node.id, s)}
              />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", paddingLeft: "12px" }}>
              {node.children.map((scene) => (
                <div
                  key={scene.id}
                  onDragOver={(e) => hover(e, scene.id, [half(e, "y")])}
                  onDrop={commitDrop}
                  style={{ opacity: dragId === scene.id ? 0.4 : 1 }}>
                  <IndexCard
                    chapter={scene}
                    isChapter={false}
                    active={scene.id === activeChapterId}
                    dropEdge={edgeFor(scene.id)}
                    draggable={canEditStructure}
                    onDragStart={startDrag(scene.id)}
                    onDragEnd={endDrag}
                    onOpen={() => onOpen(scene.id)}
                    onRename={(t) => onRename(scene.id, t)}
                    onSynopsisChange={(s) => onSynopsisChange(scene.id, s)}
                  />
                </div>
              ))}
              {canEditStructure && <button
                onClick={() => onAdd(node.id)}
                style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 8px", background: "none", border: "1px dashed var(--border-color)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "11.5px" }}>
                <Plus style={{ width: "11px", height: "11px" }} /> Scene
              </button>}
            </div>
          </div>
        ))}
        {canEditStructure && <button
          onClick={() => onAdd(null)}
          style={{ width: LANE_WIDTH, flexShrink: 0, height: "120px", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", background: "transparent", border: "1px dashed var(--border-color)", color: "var(--text-dim)", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "12px" }}>
          <Plus style={{ width: "13px", height: "13px" }} /> New chapter
        </button>}
      </div>
    </div>
  );
}
