"use client";

import { useRef, useState } from "react";
import { FileUp, ListTree, Loader2, RefreshCw, Trash2 } from "lucide-react";
import OutlineViewer from "@/components/outline/OutlineViewer";
import { timeAgo } from "@/components/editor/NotesPanel";
import type { OutlineDoc } from "@/lib/outlineDocs";
import type { OutlineDocsApi } from "@/hooks/useOutlineDocs";

const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc";

export type OutlineNotice = { id: string; warnings: string[] } | null;

/** "Upload outline" and the uploaded outlines, at the top of the Story Bible's Outline list. */
export function OutlineDocList({
  api, activeId, onOpen, onUploaded, chapterCount,
}: {
  api: OutlineDocsApi;
  /** Chapter cards listed below; labelled when there are outlines above them too. */
  chapterCount: number;
  activeId: string | null;
  onOpen: (id: string) => void;
  onUploaded: (outline: OutlineDoc, warnings: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const { outline, warnings } = await api.upload(file);
      onUploaded(outline, warnings);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ paddingBottom: "4px" }}>
      <div style={{ padding: "0 8px 8px" }}>
        <input
          ref={fileRef}
          type="file"
          accept={DOCX_ACCEPT}
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void upload(file);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Upload an outline you wrote in Word. It shows in the editor's sidebar, beside your chapters."
          style={{
            width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px",
            background: "transparent", border: "1px dashed var(--gold-border)", cursor: "pointer",
            color: "var(--gold-primary)", fontSize: "12px", fontFamily: "var(--font-inter)",
          }}>
          {uploading
            ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} />
            : <FileUp style={{ width: "13px", height: "13px" }} />}
          {uploading ? "Uploading…" : "Upload Outline (.docx)"}
        </button>
        {error && (
          <p role="alert" style={{ margin: "6px 2px 0", fontSize: "11px", fontFamily: "var(--font-inter)", color: "#ef4444", lineHeight: 1.5 }}>
            {error}
          </p>
        )}
      </div>

      {api.outlines.map((o) => {
        const active = o.id === activeId;
        return (
          <button
            key={o.id}
            onClick={() => onOpen(o.id)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: "10px", padding: "10px 16px",
              background: active ? "var(--gold-subtle)" : "transparent", border: "none",
              borderLeft: active ? "2px solid var(--gold-primary)" : "2px solid transparent",
              cursor: "pointer", textAlign: "left",
            }}>
            <ListTree style={{ width: "13px", height: "13px", color: "var(--gold-primary)", flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 500, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.title}
              </span>
              <span style={{ display: "block", fontSize: "10.5px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                Uploaded outline · {o.wordCount.toLocaleString()} words
              </span>
            </span>
          </button>
        );
      })}
      {api.outlines.length > 0 && chapterCount > 0 && (
        <div style={{ margin: "6px 16px 2px", fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>
          Chapters
        </div>
      )}
    </div>
  );
}

const button: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px", padding: "7px 12px", cursor: "pointer",
  fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600,
  background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)",
};

/** One uploaded outline, full width, with rename, replace and delete. */
export function OutlineDocDetail({
  outline, api, notice, onNotice, onDeleted,
}: {
  outline: OutlineDoc;
  api: OutlineDocsApi;
  notice: OutlineNotice;
  onNotice: (notice: OutlineNotice) => void;
  onDeleted: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(outline.title);
  const [busy, setBusy] = useState<"replace" | "delete" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (kind: "replace" | "delete", action: () => Promise<void>) => {
    setBusy(kind);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveTitle = () => {
    const next = title.trim();
    if (!next) setTitle(outline.title);
    else if (next !== outline.title) void api.rename(outline.id, next).catch((err: Error) => setError(err.message));
  };

  return (
    <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "4px" }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          aria-label="Outline title"
          maxLength={200}
          style={{
            flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", padding: 0,
            fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", color: "var(--text-primary)",
          }}
        />
        <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
          <input
            ref={fileRef}
            type="file"
            accept={DOCX_ACCEPT}
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              void run("replace", async () => {
                const { warnings } = await api.replace(outline.id, file);
                onNotice(warnings.length ? { id: outline.id, warnings } : null);
              });
            }}
          />
          <button onClick={() => fileRef.current?.click()} disabled={busy !== null} title="Upload a newer version of this outline (.docx)" style={button}>
            {busy === "replace" ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <RefreshCw style={{ width: "13px", height: "13px" }} />}
            Replace
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={() => void run("delete", async () => { await api.remove(outline.id); onDeleted(); })}
                disabled={busy !== null}
                style={{ ...button, background: "rgba(239,68,68,0.1)", borderColor: "rgba(239,68,68,0.4)", color: "#ef4444" }}>
                {busy === "delete" ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <Trash2 style={{ width: "13px", height: "13px" }} />}
                Delete outline
              </button>
              <button onClick={() => setConfirmDelete(false)} style={button}>Cancel</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} title="Delete this outline" aria-label="Delete this outline" style={{ ...button, padding: "7px 9px" }}>
              <Trash2 style={{ width: "13px", height: "13px" }} />
            </button>
          )}
        </div>
      </div>
      <p style={{ margin: "0 0 1.25rem", fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
        {[outline.fileName, `${outline.wordCount.toLocaleString()} words`, outline.updatedAt ? `updated ${timeAgo(outline.updatedAt)}` : null]
          .filter(Boolean)
          .join(" · ")}
        {" · "}Shown in the editor&apos;s sidebar under Outline
      </p>
      {error && (
        <p role="alert" style={{ margin: "0 0 1rem", padding: "8px 12px", fontSize: "12.5px", fontFamily: "var(--font-inter)", color: "#f87171", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          {error}
        </p>
      )}
      {notice?.id === outline.id && (
        <p role="status" style={{ margin: "0 0 1rem", padding: "8px 12px", fontSize: "12.5px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)", background: "var(--gold-subtle)", border: "1px solid var(--gold-border)" }}>
          {notice.warnings.join(" ")}
        </p>
      )}
      <OutlineViewer key={`${outline.id}:${outline.updatedAt}`} html={outline.content} />
    </div>
  );
}
