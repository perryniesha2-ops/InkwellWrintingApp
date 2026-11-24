"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BookMarked, FileUp, ListTree, Loader2, X } from "lucide-react";
import OutlineViewer from "@/components/outline/OutlineViewer";
import { timeAgo } from "@/components/editor/NotesPanel";
import type { OutlineDocsApi } from "@/hooks/useOutlineDocs";

interface OutlinePanelProps {
  api: OutlineDocsApi;
  documentId: string;
  /** The outline to show, or null for the list (or the only outline). */
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  /** The chapter open in the editor, to jump to its part of the outline. */
  chapterTitle: string;
  /** Upload a .docx and show it. Throws an Error with a message to show. */
  onUpload: (file: File) => Promise<void>;
  /** Things left out of an outline's upload, such as images. */
  notice: { id: string; warnings: string[] } | null;
  onDismissNotice: () => void;
  isOpen: boolean;
  onClose: () => void;
  readOnly?: boolean;
}

const iconButton: React.CSSProperties = {
  color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px",
};
const small: React.CSSProperties = { fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" };

/** An outline from the Story Bible, beside the manuscript. */
export default function OutlinePanel({
  api, documentId, selectedId, onSelect, chapterTitle, onUpload, notice, onDismissNotice, isOpen, onClose, readOnly = false,
}: OutlinePanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { outlines } = api;
  const current = outlines.find((o) => o.id === selectedId) ?? (outlines.length === 1 ? outlines[0] : null);
  const shownNotice = current && notice?.id === current.id ? notice.warnings : null;

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      await onUpload(file);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const uploadButton = !readOnly && (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <button title="Upload an outline (.docx)" onClick={() => fileRef.current?.click()} disabled={uploading} style={iconButton}>
        {uploading
          ? <Loader2 className="animate-spin" style={{ width: "14px", height: "14px" }} />
          : <FileUp style={{ width: "14px", height: "14px" }} />}
      </button>
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "fixed", right: 0, top: "48px", bottom: 0, width: "320px", zIndex: 40,
            display: "flex", flexDirection: "column", background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border-color)", fontFamily: "var(--font-inter)",
          }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px", height: "48px", flexShrink: 0, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ListTree style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Outline</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
              {uploadButton}
              <Link href={`/bible/${documentId}`} title="Open in Story Bible" style={{ ...iconButton, textDecoration: "none" }}>
                <BookMarked style={{ width: "14px", height: "14px" }} />
              </Link>
              <button title="Close" aria-label="Close outline" onClick={onClose} style={iconButton}>
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px 24px" }}>
            {error && (
              <p role="alert" style={{ margin: "0 0 12px", padding: "8px 10px", fontSize: "12px", color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </p>
            )}

            {current ? (
              <>
                {outlines.length > 1 && (
                  <button onClick={() => onSelect(null)} style={{ ...iconButton, gap: "6px", padding: "0 0 10px", fontSize: "11px", color: "var(--text-dim)" }}>
                    <ArrowLeft style={{ width: "12px", height: "12px" }} /> All outlines
                  </button>
                )}
                <h2 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "16px", color: "var(--text-primary)", margin: "0 0 2px", overflowWrap: "anywhere" }}>
                  {current.title}
                </h2>
                <p style={{ ...small, margin: "0 0 12px" }}>
                  {current.wordCount.toLocaleString()} words
                  {current.updatedAt ? ` · updated ${timeAgo(current.updatedAt)}` : ""}
                </p>
                {shownNotice && (
                  <div role="status" style={{ display: "flex", gap: "8px", alignItems: "flex-start", margin: "0 0 12px", padding: "8px 10px", fontSize: "11.5px", color: "var(--text-secondary)", background: "var(--gold-subtle)", border: "1px solid var(--gold-border)" }}>
                    <span style={{ flex: 1 }}>{shownNotice.join(" ")}</span>
                    <button aria-label="Dismiss" onClick={onDismissNotice} style={{ ...iconButton, padding: 0 }}>
                      <X style={{ width: "11px", height: "11px" }} />
                    </button>
                  </div>
                )}
                <OutlineViewer key={current.id} html={current.content} chapterTitle={chapterTitle} jumpToChapter compact />
              </>
            ) : outlines.length > 0 ? (
              outlines.map((o) => (
                <button key={o.id} onClick={() => onSelect(o.id)}
                  style={{ display: "flex", gap: "10px", width: "100%", textAlign: "left", padding: "9px 4px", background: "transparent", border: "none", borderTop: "1px solid var(--border-subtle)", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                  <ListTree style={{ width: "13px", height: "13px", marginTop: "2px", flexShrink: 0, color: "var(--text-dim)" }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: "13px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {o.title}
                    </span>
                    <span style={{ ...small, display: "block" }}>
                      {o.wordCount.toLocaleString()} words{o.updatedAt ? ` · ${timeAgo(o.updatedAt)}` : ""}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div style={{ textAlign: "center", padding: "2.5rem 0.5rem" }}>
                <ListTree style={{ width: "28px", height: "28px", color: "var(--gold-primary)", opacity: 0.35, margin: "0 auto 12px" }} />
                <p style={{ fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.6, margin: "0 0 14px" }}>
                  {api.loaded
                    ? "Upload your outline from Word to keep it beside your manuscript. It's saved in the Story Bible."
                    : "Loading…"}
                </p>
                {!readOnly && api.loaded && (
                  <button onClick={() => fileRef.current?.click()} disabled={uploading}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 14px", fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600, color: "var(--bg-primary)", background: "var(--gold-primary)", border: "none", cursor: "pointer" }}>
                    {uploading ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <FileUp style={{ width: "13px", height: "13px" }} />}
                    {uploading ? "Uploading…" : "Upload outline (.docx)"}
                  </button>
                )}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
