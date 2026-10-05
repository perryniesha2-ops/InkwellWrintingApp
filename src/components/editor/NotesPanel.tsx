"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, ExternalLink, FileText, Globe, ImagePlus, Loader2, Maximize2, NotebookPen, Plus, Quote, Search, Trash2, X,
} from "lucide-react";
import { imageFilesFrom } from "@/lib/prepareImage";
import { buildChapterTree, flattenChapterTree, type Chapter } from "@/lib/chapters";
import { byRecent, safeSourceUrl, sourceHost, type Note, type NoteAttachment, type NoteKind } from "@/lib/notes";
import type { NotesApi } from "@/hooks/useNotes";

type Filter = "all" | "note" | "research" | "chapter";

interface NotesPanelProps {
  api: NotesApi;
  chapters: Chapter[];
  activeChapterId: string | null;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** Text currently selected in the editor, offered as "Clip selection". */
  selectionText: string;
  onGoToChapter: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

const label: React.CSSProperties = {
  display: "block", fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "6px",
};
const inputBase: React.CSSProperties = {
  width: "100%", background: "var(--bg-primary)", color: "var(--text-primary)",
  border: "1px solid var(--border-color)", outline: "none", padding: "7px 9px",
  fontSize: "13px", fontFamily: "var(--font-inter)", lineHeight: 1.55,
};
const iconButton: React.CSSProperties = {
  color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px",
};

export function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function KindIcon({ kind, size = 13 }: { kind: NoteKind; size?: number }) {
  const Icon = kind === "research" ? Globe : FileText;
  return <Icon style={{ width: size, height: size, flexShrink: 0, color: kind === "research" ? "var(--gold-primary)" : "var(--text-dim)" }} />;
}

/** Full-size view; click the image to toggle fit-to-screen / actual size. */
function Lightbox({ image, onClose }: { image: NoteAttachment; onClose: () => void }) {
  const [actualSize, setActualSize] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return createPortal(
    <div
      role="dialog"
      aria-label={image.caption || image.name}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.85)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 16px", color: "#eee", fontFamily: "var(--font-inter)", fontSize: "13px", flexShrink: 0 }}>
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{image.caption || image.name}</span>
        <span style={{ color: "#aaa", fontSize: "12px" }}>{actualSize ? "Actual size · click to fit" : "Click image for actual size"}</span>
        <a href={image.url} target="_blank" rel="noopener noreferrer" style={{ color: "#eee", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
          <ExternalLink style={{ width: "13px", height: "13px" }} /> Original
        </a>
        <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "none", color: "#eee", cursor: "pointer", display: "flex", padding: "4px" }}>
          <X style={{ width: "18px", height: "18px" }} />
        </button>
      </div>
      <div
        onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
        style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", alignItems: actualSize ? "flex-start" : "center", justifyContent: actualSize ? "flex-start" : "center", padding: "0 16px 16px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image.url}
          alt={image.caption || image.name}
          onClick={() => setActualSize((a) => !a)}
          style={actualSize
            ? { maxWidth: "none", cursor: "zoom-out", margin: "auto" }
            : { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", cursor: "zoom-in" }}
        />
      </div>
    </div>,
    document.body,
  );
}

function Clippings({ note, api, readOnly, uploading, error, onBrowse }: {
  note: Note; api: NotesApi; readOnly: boolean; uploading: boolean; error: string | null; onBrowse: () => void;
}) {
  const [viewing, setViewing] = useState<NoteAttachment | null>(null);
  if (readOnly && note.attachments.length === 0) return null;
  return (
    <div>
      <label style={label}>Clippings &amp; images</label>
      {note.attachments.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
          {note.attachments.map((a) => (
            <figure key={a.path} style={{ margin: 0, display: "flex", flexDirection: "column", gap: "4px" }}>
              <div className="group" style={{ position: "relative" }}>
                <button onClick={() => setViewing(a)} title="View full size" style={{ display: "block", width: "100%", padding: 0, border: "1px solid var(--border-color)", background: "var(--bg-primary)", cursor: "zoom-in" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.caption || a.name} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "4 / 3", objectFit: "cover" }} />
                </button>
                <span aria-hidden className="opacity-0 group-hover:opacity-100" style={{ position: "absolute", left: "4px", top: "4px", background: "rgba(0,0,0,0.6)", color: "#fff", display: "flex", padding: "3px", pointerEvents: "none" }}>
                  <Maximize2 style={{ width: "10px", height: "10px" }} />
                </span>
                {!readOnly && (
                  <button
                    title="Remove image"
                    onClick={() => api.removeImage(note.id, a.path)}
                    className="opacity-0 group-hover:opacity-100"
                    style={{ position: "absolute", right: "4px", top: "4px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", cursor: "pointer", display: "flex", padding: "3px" }}>
                    <X style={{ width: "11px", height: "11px" }} />
                  </button>
                )}
              </div>
              <input
                value={a.caption}
                readOnly={readOnly}
                placeholder={readOnly ? "" : "Caption: source, date…"}
                onChange={(e) => api.setCaption(note.id, a.path, e.target.value)}
                style={{ ...inputBase, padding: "4px 6px", fontSize: "11px" }}
              />
            </figure>
          ))}
        </div>
      )}
      {!readOnly && (
        <button
          onClick={onBrowse}
          disabled={uploading}
          style={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px",
            border: "1px dashed var(--border-color)", background: "var(--bg-primary)", color: "var(--text-dim)",
            cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-inter)", lineHeight: 1.4, textAlign: "center",
          }}>
          {uploading ? <Loader2 className="animate-spin" style={{ width: "14px", height: "14px", flexShrink: 0 }} /> : <ImagePlus style={{ width: "14px", height: "14px", flexShrink: 0 }} />}
          {uploading ? "Uploading…" : "Drop images, paste a screenshot (⌘V), or browse"}
        </button>
      )}
      {error && <p style={{ margin: "6px 0 0", fontSize: "11px", fontFamily: "var(--font-inter)", color: "#ef4444" }}>{error}</p>}
      {viewing && <Lightbox image={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}

function NoteDetail({ note, api, chapters, onBack, onGoToChapter, readOnly }: {
  note: Note; api: NotesApi; chapters: Chapter[]; onBack: () => void; onGoToChapter: (id: string) => void; readOnly: boolean;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  const upload = async (files: File[]) => {
    if (readOnly || files.length === 0) return;
    setUploading(true);
    setUploadError(await api.addImages(note.id, files));
    setUploading(false);
  };
  const set = (patch: Parameters<NotesApi["update"]>[1]) => { if (!readOnly) api.update(note.id, patch); };
  const href = safeSourceUrl(note.sourceUrl);
  const ordered = flattenChapterTree(buildChapterTree(chapters));
  const linked = chapters.find((c) => c.id === note.chapterId);

  // New, untitled notes: put the cursor in the title.
  useEffect(() => {
    if (!readOnly && /^New (note|research)$/.test(note.title)) titleRef.current?.select();
    // Only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  return (
    <div
      // Paste a screenshot anywhere in the note (text pastes behave normally).
      onPaste={(e) => {
        const files = imageFilesFrom(e.clipboardData);
        if (files.length && !readOnly) {
          e.preventDefault();
          void upload(files);
        }
      }}
      onDragOver={(e) => { if (!readOnly && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragging(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragging(false); }}
      onDrop={(e) => {
        setDragging(false);
        const files = imageFilesFrom(e.dataTransfer);
        if (files.length && !readOnly) {
          e.preventDefault();
          void upload(files);
        }
      }}
      style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "14px", minHeight: "100%", outline: dragging ? "2px dashed var(--gold-primary)" : "none", outlineOffset: "-6px" }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          e.target.value = "";
          void upload(files);
        }}
      />
      <button onClick={onBack} style={{ ...iconButton, gap: "6px", fontSize: "11px", fontFamily: "var(--font-inter)", padding: 0, alignSelf: "flex-start" }}>
        <ArrowLeft style={{ width: "12px", height: "12px" }} /> All notes
      </button>

      <div style={{ display: "flex", border: "1px solid var(--border-color)", alignSelf: "flex-start" }} role="radiogroup" aria-label="Type">
        {([["note", "Note"], ["research", "Research"]] as const).map(([kind, text]) => (
          <button
            key={kind}
            role="radio"
            aria-checked={note.kind === kind}
            disabled={readOnly}
            onClick={() => set({ kind })}
            style={{
              display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", border: "none",
              cursor: readOnly ? "default" : "pointer", fontSize: "11.5px", fontFamily: "var(--font-inter)", fontWeight: 600,
              background: note.kind === kind ? "var(--gold-subtle)" : "transparent",
              color: note.kind === kind ? "var(--gold-primary)" : "var(--text-muted)",
            }}>
            <KindIcon kind={kind} size={11} /> {text}
          </button>
        ))}
      </div>

      <input
        ref={titleRef}
        value={note.title}
        readOnly={readOnly}
        placeholder="Title"
        onChange={(e) => set({ title: e.target.value })}
        style={{ ...inputBase, border: "none", borderBottom: "1px solid var(--border-color)", background: "transparent", padding: "4px 0", fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "17px", letterSpacing: "-0.01em" }}
      />

      {note.kind === "research" && (
        <div>
          <label style={label}>Source</label>
          <div style={{ display: "flex", gap: "6px" }}>
            <input
              value={note.sourceUrl}
              readOnly={readOnly}
              placeholder="https://… (article, book, video)"
              onChange={(e) => set({ sourceUrl: e.target.value })}
              style={{ ...inputBase, flex: 1, minWidth: 0 }}
            />
            {href && (
              <a href={href} target="_blank" rel="noopener noreferrer" title={`Open ${sourceHost(note.sourceUrl)}`}
                style={{ ...iconButton, alignItems: "center", border: "1px solid var(--border-color)", padding: "0 9px", textDecoration: "none" }}>
                <ExternalLink style={{ width: "13px", height: "13px" }} />
              </a>
            )}
          </div>
          {note.sourceUrl.trim() && !href && (
            <p style={{ margin: "4px 0 0", fontSize: "11px", fontFamily: "var(--font-inter)", color: "#e07b4f" }}>That doesn&apos;t look like a web link.</p>
          )}
        </div>
      )}

      <div>
        <label style={label}>About chapter</label>
        <div style={{ display: "flex", gap: "6px" }}>
          <select
            value={note.chapterId ?? ""}
            disabled={readOnly}
            onChange={(e) => set({ chapterId: e.target.value || null })}
            style={{ ...inputBase, flex: 1, minWidth: 0 }}>
            <option value="">Whole book</option>
            {ordered.map((c) => (
              <option key={c.id} value={c.id}>{c.parent_id ? "    " : ""}{c.title || "Untitled"}</option>
            ))}
          </select>
          {linked && (
            <button title={`Go to ${linked.title}`} onClick={() => onGoToChapter(linked.id)}
              style={{ ...iconButton, alignItems: "center", border: "1px solid var(--border-color)", padding: "0 9px", fontSize: "11px", fontFamily: "var(--font-inter)" }}>
              Open
            </button>
          )}
        </div>
      </div>

      <Clippings note={note} api={api} readOnly={readOnly} uploading={uploading} error={uploadError} onBrowse={() => fileRef.current?.click()} />

      <div>
        <label style={label}>{note.kind === "research" ? "Notes & quotes" : "Note"}</label>
        <textarea
          value={note.content}
          readOnly={readOnly}
          placeholder={note.kind === "research"
            ? "Key facts, quotes, what you'll use this for…"
            : "Ideas, reminders, things to fix, what-ifs…"}
          onChange={(e) => set({ content: e.target.value })}
          rows={14}
          style={{ ...inputBase, resize: "vertical", minHeight: "200px" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "10px" }}>
        <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
          {note.updatedAt ? `Edited ${timeAgo(note.updatedAt)} · saved automatically` : "Saved automatically"}
        </span>
        {readOnly ? null : confirmDelete ? (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)" }}>Delete?</span>
            <button onClick={() => { void api.remove(note.id); onBack(); }} style={{ ...iconButton, color: "#ef4444", fontSize: "11px", fontFamily: "var(--font-inter)" }}>Yes</button>
            <button onClick={() => setConfirmDelete(false)} style={{ ...iconButton, fontSize: "11px", fontFamily: "var(--font-inter)" }}>No</button>
          </div>
        ) : (
          <button title="Delete note" onClick={() => setConfirmDelete(true)} style={iconButton}>
            <Trash2 style={{ width: "13px", height: "13px" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function NotesPanel({
  api, chapters, activeChapterId, selectedId, onSelect, selectionText, onGoToChapter, isOpen, onClose, readOnly = false,
}: NotesPanelProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [menuOpen, setMenuOpen] = useState(false);
  const [clipping, setClipping] = useState(false);
  const [clipError, setClipError] = useState<string | null>(null);
  const [listDragging, setListDragging] = useState(false);
  const clipFileRef = useRef<HTMLInputElement>(null);
  const selected = api.notes.find((n) => n.id === selectedId) ?? null;
  const chapterTitle = (id: string | null) => chapters.find((c) => c.id === id)?.title;

  const q = query.trim().toLowerCase();
  const visible = api.notes
    .filter((n) =>
      filter === "all" ? true
      : filter === "chapter" ? !!activeChapterId && n.chapterId === activeChapterId
      : n.kind === filter)
    .filter((n) => !q || `${n.title} ${n.content} ${n.sourceUrl}`.toLowerCase().includes(q))
    .sort(byRecent);

  const createNote = async (kind: NoteKind, extra: { content?: string; title?: string } = {}) => {
    setMenuOpen(false);
    const note = await api.create({ kind, chapterId: filter === "chapter" ? activeChapterId : null, ...extra });
    if (note) onSelect(note.id);
  };

  // Images pasted/dropped on the list become a new research "clipping".
  const createClipping = async (files: File[]) => {
    if (readOnly || files.length === 0) return;
    setClipping(true);
    setClipError(null);
    const date = new Date().toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
    const note = await api.create({ kind: "research", title: `Clipping · ${date}`, chapterId: filter === "chapter" ? activeChapterId : null });
    if (!note) {
      setClipping(false);
      setClipError("Couldn't create the clipping.");
      return;
    }
    const problem = await api.addImages(note.id, files);
    setClipping(false);
    if (problem) setClipError(problem);
    onSelect(note.id);
  };

  const clipSelection = async () => {
    const text = selectionText.trim();
    if (!text) return;
    const quoted = text.split("\n").map((line) => `> ${line}`).join("\n");
    const note = await api.create({
      kind: "note",
      title: text.length > 48 ? `${text.slice(0, 48).trim()}…` : text,
      content: `${quoted}\n\n`,
      chapterId: activeChapterId,
    });
    if (note) onSelect(note.id);
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
            position: "fixed", right: 0, top: "48px", bottom: 0, width: "320px",
            display: "flex", flexDirection: "column", zIndex: 40,
            background: "var(--bg-surface)", borderLeft: "1px solid var(--border-color)",
          }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px", height: "48px", flexShrink: 0, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <NotebookPen style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Notes &amp; Research</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px", position: "relative" }}>
              {!readOnly && (
                <>
                  <button title="New note" onClick={() => setMenuOpen((o) => !o)} style={iconButton} aria-expanded={menuOpen}>
                    <Plus style={{ width: "14px", height: "14px" }} />
                  </button>
                  {menuOpen && (
                    <div style={{ position: "absolute", right: "28px", top: "calc(100% + 4px)", zIndex: 60, background: "var(--bg-elevated)", border: "1px solid var(--border-color)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", padding: "4px", minWidth: "150px" }}>
                      {([["note", "New note"], ["research", "New research"]] as const).map(([kind, text]) => (
                        <button key={kind} onClick={() => void createNote(kind)}
                          style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%", textAlign: "left", padding: "6px 10px", fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-primary)", background: "transparent", border: "none", cursor: "pointer" }}
                          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-subtle)"; }}
                          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                          <KindIcon kind={kind} size={12} /> {text}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
              <button onClick={onClose} style={iconButton} title="Close"><X style={{ width: "14px", height: "14px" }} /></button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {selected ? (
              <NoteDetail key={selected.id} note={selected} api={api} chapters={chapters} onBack={() => onSelect(null)} onGoToChapter={onGoToChapter} readOnly={readOnly} />
            ) : (
              <div
                onPaste={(e) => {
                  const files = imageFilesFrom(e.clipboardData);
                  if (files.length && !readOnly) { e.preventDefault(); void createClipping(files); }
                }}
                onDragOver={(e) => { if (!readOnly && e.dataTransfer.types.includes("Files")) { e.preventDefault(); setListDragging(true); } }}
                onDragLeave={(e) => { if (e.currentTarget === e.target) setListDragging(false); }}
                onDrop={(e) => {
                  setListDragging(false);
                  const files = imageFilesFrom(e.dataTransfer);
                  if (files.length && !readOnly) { e.preventDefault(); void createClipping(files); }
                }}
                style={{ padding: "12px 0", minHeight: "100%", outline: listDragging ? "2px dashed var(--gold-primary)" : "none", outlineOffset: "-6px" }}>
                <input
                  ref={clipFileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    void createClipping(files);
                  }}
                />
                <div style={{ position: "relative", margin: "0 16px 10px" }}>
                  <Search style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "var(--text-dim)" }} />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes and sources…" style={{ ...inputBase, padding: "6px 8px 6px 26px", fontSize: "12px" }} />
                </div>
                <div style={{ display: "flex", gap: "4px", padding: "0 16px 10px", flexWrap: "wrap" }}>
                  {([["all", "All"], ["note", "Notes"], ["research", "Research"], ["chapter", "This chapter"]] as const).map(([f, text]) => (
                    <button key={f} onClick={() => setFilter(f)}
                      style={{ padding: "3px 9px", fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, cursor: "pointer", border: `1px solid ${filter === f ? "var(--gold-border)" : "var(--border-color)"}`, background: filter === f ? "var(--gold-subtle)" : "transparent", color: filter === f ? "var(--gold-primary)" : "var(--text-muted)" }}>
                      {text}
                    </button>
                  ))}
                </div>
                {!readOnly && (
                  <button
                    onClick={() => clipFileRef.current?.click()}
                    disabled={clipping}
                    title="Upload images, or paste/drop them anywhere in this panel"
                    style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 16px 10px", width: "calc(100% - 32px)", padding: "7px 10px", fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", background: "var(--bg-primary)", border: "1px dashed var(--border-color)", cursor: "pointer", textAlign: "left" }}>
                    {clipping
                      ? <Loader2 className="animate-spin" style={{ width: "12px", height: "12px", flexShrink: 0 }} />
                      : <ImagePlus style={{ width: "12px", height: "12px", color: "var(--gold-primary)", flexShrink: 0 }} />}
                    {clipping ? "Uploading clipping…" : "Add clipping (or paste/drop an image here)"}
                  </button>
                )}
                {clipError && <p style={{ margin: "-4px 16px 10px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "#ef4444" }}>{clipError}</p>}
                {!readOnly && selectionText.trim() && (
                  <button onClick={() => void clipSelection()}
                    style={{ display: "flex", alignItems: "center", gap: "8px", margin: "0 16px 10px", width: "calc(100% - 32px)", padding: "7px 10px", fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", background: "var(--bg-primary)", border: "1px dashed var(--gold-border)", cursor: "pointer", textAlign: "left" }}>
                    <Quote style={{ width: "12px", height: "12px", color: "var(--gold-primary)", flexShrink: 0 }} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Clip selection: “{selectionText.trim().slice(0, 60)}”</span>
                  </button>
                )}
                {visible.length === 0 && (
                  <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", padding: "4px 16px", lineHeight: 1.6 }}>
                    {api.notes.length === 0
                      ? "Jot down ideas, keep research and sources, and link notes to chapters. Tip: select text in your chapter and press ⌘⇧N to clip it into a note."
                      : filter === "chapter" ? "No notes linked to this chapter yet." : "No matches."}
                  </p>
                )}
                {visible.map((n) => (
                  <button key={n.id} onClick={() => onSelect(n.id)}
                    style={{ display: "flex", gap: "10px", width: "100%", textAlign: "left", padding: "8px 16px", background: "transparent", border: "none", borderTop: "1px solid var(--border-subtle)", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                    <span style={{ marginTop: "2px" }}><KindIcon kind={n.kind} /></span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: "13px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.title || "Untitled"}
                      </span>
                      <span style={{ display: "block", fontSize: "11.5px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {n.kind === "research" && sourceHost(n.sourceUrl) ? `${sourceHost(n.sourceUrl)} · ` : ""}{n.content.replace(/^>\s?/gm, "").replace(/\s+/g, " ").trim() || "Empty"}
                      </span>
                      <span style={{ display: "block", fontSize: "10.5px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", marginTop: "2px" }}>
                        {timeAgo(n.updatedAt)}{chapterTitle(n.chapterId) ? ` · ${chapterTitle(n.chapterId)}` : ""}
                        {n.attachments.length > 1 ? ` · ${n.attachments.length} images` : ""}
                      </span>
                    </span>
                    {n.attachments[0] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={n.attachments[0].url} alt="" loading="lazy" style={{ width: "44px", height: "44px", objectFit: "cover", flexShrink: 0, border: "1px solid var(--border-color)" }} />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
