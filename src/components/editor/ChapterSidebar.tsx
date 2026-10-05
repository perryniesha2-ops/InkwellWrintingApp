"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronRight, ChevronsLeft, ChevronsRight, GripVertical,
  Plus, Trash2, Users, MapPin, Sparkles, BookMarked, FileText, FileUp, Loader2, Globe, NotebookPen,
} from "lucide-react";
import {
  buildChapterTree, moveChapter,
  type Chapter, type DropPosition,
} from "@/lib/chapters";
import { groupElements, type NewElementType, type StoryElement } from "@/lib/storyElements";
import NewElementMenu from "@/components/editor/NewElementMenu";
import type { Peer } from "@/hooks/useBookChannel";
import { byRecent, type Note, type NoteKind } from "@/lib/notes";

interface ChapterSidebarProps {
  documentId: string;
  chapters: Chapter[];
  activeChapterId: string | null;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelect: (id: string) => void;
  onAdd: (parentId: string | null) => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onMove: (dragId: string, targetId: string, position: DropPosition) => void;
  elements: StoryElement[];
  onOpenElement: (id: string) => void;
  onCreateElement: (type: NewElementType) => void;
  /** Add a .docx file's chapters to this book. */
  onImport: (file: File) => Promise<void>;
  /** False for collaborators limited to certain chapters: no add/delete/move/import. */
  canEditStructure: boolean;
  /** Other people in the book, shown next to the chapter they have open. */
  peers: Peer[];
  notes: Note[];
  /** Open a note in the right sidebar, or the notes list when null. */
  onOpenNote: (id: string | null) => void;
  onCreateNote: (kind: NoteKind) => void;
}

const RECENT_NOTES = 5;

const sectionLabel: React.CSSProperties = {
  fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)",
};

const iconButton: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "3px", background: "none", border: "none", cursor: "pointer",
  color: "var(--text-dim)",
};

export default function ChapterSidebar({
  documentId, chapters, activeChapterId, collapsed, onToggleCollapsed,
  onSelect, onAdd, onRename, onDelete, onMove,
  elements, onOpenElement, onCreateElement, onImport, canEditStructure, peers,
  notes, onOpenNote, onCreateNote,
}: ChapterSidebarProps) {
  const [noteMenuOpen, setNoteMenuOpen] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; position: DropPosition } | null>(null);
  const [elementsOpen, setElementsOpen] = useState<Record<string, boolean>>({ Characters: true });

  const tree = buildChapterTree(chapters);
  const elementGroups = groupElements(elements);

  if (collapsed) {
    return (
      <div style={{ width: "20px", minWidth: "20px", position: "relative", borderRight: "1px solid var(--border-color)" }}>
        <button
          onClick={onToggleCollapsed}
          title="Show sidebar (⌘\)"
          style={{
            ...iconButton, position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)",
            width: "20px", height: "48px", background: "var(--bg-surface)",
            border: "1px solid var(--border-color)", borderLeft: "none",
          }}>
          <ChevronsRight style={{ width: "12px", height: "12px" }} />
        </button>
      </div>
    );
  }

  const commitRename = () => {
    if (renaming && draft.trim()) onRename(renaming, draft.trim());
    setRenaming(null);
  };

  // Middle of a top-level row nests; top/bottom edges insert before/after.
  // Falls back to before/after when nesting isn't allowed for this drag.
  const positionFor = (e: React.DragEvent, chapter: Chapter): DropPosition | null => {
    if (!dragId) return null;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = (e.clientY - rect.top) / rect.height;
    const edge: DropPosition = y < 0.5 ? "before" : "after";
    const candidates: DropPosition[] =
      !chapter.parent_id && y > 0.25 && y < 0.75 ? ["inside", edge] : [edge];
    return candidates.find((p) => moveChapter(chapters, dragId, chapter.id, p)) ?? null;
  };

  const renderRow = (chapter: Chapter, depth: number, childCount: number) => {
    const active = chapter.id === activeChapterId;
    const isOpen = expanded[chapter.id] ?? true;
    const dropHere = drop?.id === chapter.id ? drop.position : null;

    return (
      <div
        key={chapter.id}
        draggable={canEditStructure && renaming !== chapter.id}
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/plain", chapter.id);
          setDragId(chapter.id);
        }}
        onDragEnd={() => { setDragId(null); setDrop(null); }}
        onDragOver={(e) => {
          const position = positionFor(e, chapter);
          if (!position) { if (drop) setDrop(null); return; }
          e.preventDefault();
          if (drop?.id !== chapter.id || drop.position !== position) setDrop({ id: chapter.id, position });
        }}
        onDragLeave={() => { if (drop?.id === chapter.id) setDrop(null); }}
        onDrop={(e) => {
          e.preventDefault();
          if (dragId && drop) {
            onMove(dragId, drop.id, drop.position);
            if (drop.position === "inside") setExpanded((x) => ({ ...x, [drop.id]: true }));
          }
          setDragId(null);
          setDrop(null);
        }}
        onClick={() => onSelect(chapter.id)}
        onDoubleClick={() => { setRenaming(chapter.id); setDraft(chapter.title); }}
        className="group"
        style={{
          display: "flex", alignItems: "center", gap: "4px",
          padding: `5px 8px 5px ${8 + depth * 16}px`,
          cursor: "pointer",
          opacity: dragId === chapter.id ? 0.4 : 1,
          background: dropHere === "inside" ? "var(--gold-subtle)" : active ? "var(--bg-elevated)" : "transparent",
          borderLeft: active ? "2px solid var(--gold-primary)" : "2px solid transparent",
          boxShadow:
            dropHere === "before" ? "inset 0 2px 0 var(--gold-primary)"
            : dropHere === "after" ? "inset 0 -2px 0 var(--gold-primary)"
            : dropHere === "inside" ? "inset 0 0 0 1px var(--gold-border)"
            : "none",
        }}>
        {canEditStructure && (
          <GripVertical className="opacity-0 group-hover:opacity-100" style={{ width: "11px", height: "11px", color: "var(--text-dim)", flexShrink: 0, cursor: "grab" }} />
        )}
        {depth === 0 && childCount > 0 ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded((x) => ({ ...x, [chapter.id]: !isOpen })); }}
            style={iconButton}>
            {isOpen
              ? <ChevronDown style={{ width: "11px", height: "11px" }} />
              : <ChevronRight style={{ width: "11px", height: "11px" }} />}
          </button>
        ) : (
          <FileText style={{ width: "11px", height: "11px", color: "var(--text-dim)", flexShrink: 0, margin: "0 3px" }} />
        )}
        {renaming === chapter.id ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") setRenaming(null);
            }}
            style={{
              flex: 1, minWidth: 0, fontSize: "12px", fontFamily: "var(--font-inter)",
              background: "var(--bg-primary)", color: "var(--text-primary)",
              border: "1px solid var(--gold-border)", outline: "none", padding: "1px 4px",
            }}
          />
        ) : (
          <span style={{
            flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            fontSize: depth === 0 ? "12px" : "11.5px",
            fontFamily: depth === 0 ? "var(--font-dm-sans)" : "var(--font-inter)",
            fontWeight: depth === 0 ? 600 : 400,
            color: active ? "var(--gold-primary)" : "var(--text-muted)",
          }}>
            {chapter.title || "Untitled"}
          </span>
        )}
        {peers.filter((p) => p.chapterId === chapter.id).map((p) => (
          <span key={p.id} title={`${p.name} is here`} style={{ width: "7px", height: "7px", borderRadius: "50%", background: p.color, flexShrink: 0 }} />
        ))}
        {canEditStructure && (
        <div className="opacity-0 group-hover:opacity-100" style={{ display: "flex", flexShrink: 0 }}>
          {depth === 0 && (
            <button
              title="Add subchapter"
              onClick={(e) => { e.stopPropagation(); onAdd(chapter.id); setExpanded((x) => ({ ...x, [chapter.id]: true })); }}
              style={iconButton}>
              <Plus style={{ width: "11px", height: "11px" }} />
            </button>
          )}
          <button
            title="Delete"
            onClick={(e) => { e.stopPropagation(); onDelete(chapter.id); }}
            style={iconButton}>
            <Trash2 style={{ width: "11px", height: "11px" }} />
          </button>
        </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      width: "260px", minWidth: "260px", flexShrink: 0,
      borderRight: "1px solid var(--border-color)", background: "var(--bg-surface)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 8px 0 12px", height: "40px", flexShrink: 0,
        borderBottom: "1px solid var(--border-color)",
      }}>
        <span style={sectionLabel}>Manuscript</span>
        <div style={{ display: "flex", gap: "2px" }}>
          {canEditStructure && (
          <>
          <button title="Import chapters from a Word document (.docx)" onClick={() => importRef.current?.click()} disabled={importing} style={iconButton}>
            {importing
              ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} />
              : <FileUp style={{ width: "13px", height: "13px" }} />}
          </button>
          <input
            ref={importRef}
            type="file"
            accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc"
            hidden
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setImporting(true);
              await onImport(file);
              setImporting(false);
            }}
          />
          <button title="New chapter" onClick={() => onAdd(null)} style={iconButton}>
            <Plus style={{ width: "13px", height: "13px" }} />
          </button>
          </>
          )}
          <button title="Hide sidebar (⌘\)" onClick={onToggleCollapsed} style={iconButton}>
            <ChevronsLeft style={{ width: "13px", height: "13px" }} />
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
        {/* Chapters */}
        <div style={{ padding: "6px 0" }}>
          {tree.map((node) => (
            <div key={node.id}>
              {renderRow(node, 0, node.children.length)}
              {(expanded[node.id] ?? true) && node.children.map((child) => renderRow(child, 1, 0))}
            </div>
          ))}
          {canEditStructure && (
            <button
              onClick={() => onAdd(null)}
              style={{
                ...iconButton, gap: "6px", padding: "6px 12px", fontSize: "11px",
                fontFamily: "var(--font-inter)", justifyContent: "flex-start", width: "100%",
              }}>
              <Plus style={{ width: "11px", height: "11px" }} /> New chapter
            </button>
          )}
        </div>

        {/* Story elements */}
        <div style={{ borderTop: "1px solid var(--border-color)", padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 6px 12px" }}>
            <span style={sectionLabel}>Story Elements</span>
            <div style={{ display: "flex", gap: "2px" }}>
              {canEditStructure && (
                <NewElementMenu onPick={onCreateElement} buttonStyle={iconButton}>
                  <Plus style={{ width: "12px", height: "12px" }} />
                </NewElementMenu>
              )}
              <Link href={`/bible/${documentId}`} title="Open Story Bible" style={{ ...iconButton, textDecoration: "none" }}>
                <BookMarked style={{ width: "12px", height: "12px" }} />
              </Link>
            </div>
          </div>
          {elementGroups.length === 0 && (
            <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", fontStyle: "italic", padding: "0 12px", margin: 0 }}>
              No characters, places or themes yet.
            </p>
          )}
          {elementGroups.map(([group, items]) => {
            const Icon = group === "Characters" ? Users : group === "Locations" ? MapPin : Sparkles;
            const open = elementsOpen[group] ?? false;
            return (
              <div key={group}>
                <button
                  onClick={() => setElementsOpen((x) => ({ ...x, [group]: !open }))}
                  style={{ ...iconButton, width: "100%", justifyContent: "flex-start", gap: "6px", padding: "4px 12px" }}>
                  {open ? <ChevronDown style={{ width: "11px", height: "11px" }} /> : <ChevronRight style={{ width: "11px", height: "11px" }} />}
                  <Icon style={{ width: "11px", height: "11px" }} />
                  <span style={{ fontSize: "11.5px", fontFamily: "var(--font-inter)", fontWeight: 600, color: "var(--text-muted)" }}>{group}</span>
                  <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", marginLeft: "auto" }}>{items.length}</span>
                </button>
                {open && items.map((el) => (
                  <button
                    key={el.id}
                    onClick={() => onOpenElement(el.id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "3px 12px 3px 40px",
                      fontSize: "11.5px", fontFamily: "var(--font-inter)", color: "var(--text-muted)",
                      background: "none", border: "none", cursor: "pointer",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                    {el.name || "Untitled"}
                  </button>
                ))}
              </div>
            );
          })}
        </div>

        {/* Notes & research */}
        <div style={{ borderTop: "1px solid var(--border-color)", padding: "10px 0" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px 6px 12px", position: "relative" }}>
            <button onClick={() => onOpenNote(null)} style={{ ...iconButton, padding: 0, gap: "6px" }} title="Open Notes & Research">
              <span style={sectionLabel}>Notes &amp; Research</span>
            </button>
            <div style={{ display: "flex", gap: "2px" }}>
              {canEditStructure && (
                <button title="New note" onClick={() => setNoteMenuOpen((o) => !o)} style={iconButton} aria-expanded={noteMenuOpen}>
                  <Plus style={{ width: "12px", height: "12px" }} />
                </button>
              )}
              <button title="Open Notes & Research" onClick={() => onOpenNote(null)} style={iconButton}>
                <NotebookPen style={{ width: "12px", height: "12px" }} />
              </button>
            </div>
            {noteMenuOpen && (
              <div style={{ position: "absolute", right: "8px", top: "100%", zIndex: 60, background: "var(--bg-elevated)", border: "1px solid var(--border-color)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", padding: "4px", minWidth: "140px" }}>
                {([["note", "Note", FileText], ["research", "Research", Globe]] as const).map(([kind, text, Icon]) => (
                  <button key={kind}
                    onClick={() => { setNoteMenuOpen(false); onCreateNote(kind); }}
                    style={{ ...iconButton, width: "100%", gap: "8px", padding: "6px 10px", fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-primary)" }}>
                    <Icon style={{ width: "12px", height: "12px" }} /> {text}
                  </button>
                ))}
              </div>
            )}
          </div>
          {notes.length === 0 ? (
            <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", fontStyle: "italic", padding: "0 12px", margin: 0 }}>
              Ideas, research and sources.
            </p>
          ) : (
            <>
              {[...notes].sort(byRecent).slice(0, RECENT_NOTES).map((n) => {
                const Icon = n.kind === "research" ? Globe : FileText;
                return (
                  <button key={n.id} onClick={() => onOpenNote(n.id)}
                    style={{ ...iconButton, width: "100%", justifyContent: "flex-start", gap: "8px", padding: "3px 12px 3px 16px" }}>
                    <Icon style={{ width: "11px", height: "11px", flexShrink: 0 }} />
                    <span style={{ fontSize: "11.5px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {n.title || "Untitled"}
                    </span>
                  </button>
                );
              })}
              {notes.length > RECENT_NOTES && (
                <button onClick={() => onOpenNote(null)}
                  style={{ ...iconButton, padding: "4px 12px 0 35px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--gold-primary)" }}>
                  View all {notes.length}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
