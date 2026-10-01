"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bookmark, Check, History, Loader2, Pencil, RotateCcw, ShieldCheck, Trash2, X,
} from "lucide-react";
import { sanitizeHtml } from "@/lib/sanitizeHtml";

interface Revision {
  id: string;
  name: string | null;
  kind: "auto" | "manual" | "backup";
  word_count: number;
  created_at: string;
}

interface RevisionPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  /** Bumped by the editor after an auto snapshot so the list refreshes. */
  refreshKey: number;
  /** Flush unsaved edits so a snapshot captures them. */
  flushSave: () => Promise<void>;
  /** Reload chapters after a restore. */
  onRestored: () => Promise<void>;
}

const iconButton: React.CSSProperties = {
  color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "3px",
};

const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const fullLabel = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: d.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

const defaultTitle = (r: Revision) => r.name || (r.kind === "auto" ? "Auto-save" : "Saved revision");

function Preview({ documentId, revision, onClose, onRestore }: {
  documentId: string;
  revision: Revision;
  onClose: () => void;
  onRestore: () => Promise<string | null>;
}) {
  const [html, setHtml] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/documents/${documentId}/revisions/${revision.id}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { manuscript: string }) => setHtml(sanitizeHtml(data.manuscript)))
      .catch(() => setError("Couldn't load this revision."));
  }, [documentId, revision.id]);

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && !restoring) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "min(820px, 100%)", height: "min(88vh, 100%)", display: "flex", flexDirection: "column", background: "var(--bg-surface)", border: "1px solid var(--border-color)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 16px 12px 20px", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 220px", minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>{defaultTitle(revision)}</div>
            <div style={{ fontFamily: "var(--font-inter)", fontSize: "11.5px", color: "var(--text-dim)" }}>
              {fullLabel(revision.created_at)} · {revision.word_count.toLocaleString()} words · read-only preview
            </div>
          </div>
          {confirming ? (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "var(--text-muted)" }}>
                Your current version is backed up first.
              </span>
              <button
                disabled={restoring}
                onClick={async () => {
                  setRestoring(true);
                  const err = await onRestore();
                  setRestoring(false);
                  if (err) setError(err);
                  else onClose();
                }}
                className="btn-gold"
                style={{ padding: "6px 12px", fontSize: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                {restoring ? <Loader2 className="animate-spin" style={{ width: "12px", height: "12px" }} /> : <RotateCcw style={{ width: "12px", height: "12px" }} />}
                Restore
              </button>
              <button disabled={restoring} onClick={() => setConfirming(false)} style={{ ...iconButton, fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-muted)" }}>Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              disabled={!html}
              className="btn-gold"
              style={{ padding: "6px 12px", fontSize: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              <RotateCcw style={{ width: "12px", height: "12px" }} /> Restore this version
            </button>
          )}
          <button onClick={onClose} disabled={restoring} style={iconButton}><X style={{ width: "15px", height: "15px" }} /></button>
        </div>
        {error && <p style={{ margin: 0, padding: "8px 20px", fontFamily: "var(--font-inter)", fontSize: "12px", color: "#ef4444", borderBottom: "1px solid var(--border-color)" }}>{error}</p>}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 24px" }}>
          {html === null && !error ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
              <Loader2 className="animate-spin" style={{ width: "18px", height: "18px", color: "var(--gold-primary)" }} />
            </div>
          ) : (
            <div className="editor-prose" style={{ maxWidth: "660px", margin: "0 auto" }} dangerouslySetInnerHTML={{ __html: html ?? "" }} />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function RevisionPanel({
  documentId, isOpen, onClose, refreshKey, flushSave, onRestored,
}: RevisionPanelProps) {
  const [revisions, setRevisions] = useState<Revision[] | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<Revision | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/documents/${documentId}/revisions`);
    if (res.ok) setRevisions((await res.json()) as Revision[]);
  }, [documentId]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetch(`/api/documents/${documentId}/revisions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Revision[] | null) => { if (!cancelled && data) setRevisions(data); });
    return () => { cancelled = true; };
  }, [isOpen, documentId, refreshKey]);

  const saveRevision = async () => {
    setSaving(true);
    setError(null);
    try {
      await flushSave();
      const res = await fetch(`/api/documents/${documentId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "manual", name: newName }),
      });
      if (!res.ok) throw new Error();
      const created = (await res.json()) as Revision;
      setRevisions((prev) => [created, ...(prev ?? [])]);
      setNewName("");
    } catch {
      setError("Couldn't save the revision.");
    } finally {
      setSaving(false);
    }
  };

  const rename = async (id: string) => {
    setRenaming(null);
    const res = await fetch(`/api/documents/${documentId}/revisions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: draft }),
    });
    if (res.ok) {
      const updated = (await res.json()) as Revision;
      setRevisions((prev) => prev?.map((r) => (r.id === id ? updated : r)) ?? null);
    }
  };

  const remove = async (id: string) => {
    setConfirmDelete(null);
    const res = await fetch(`/api/documents/${documentId}/revisions/${id}`, { method: "DELETE" });
    if (res.ok) setRevisions((prev) => prev?.filter((r) => r.id !== id) ?? null);
  };

  const restore = async (revision: Revision): Promise<string | null> => {
    await flushSave();
    const res = await fetch(`/api/documents/${documentId}/revisions/${revision.id}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: fullLabel(revision.created_at) }),
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      return body.error ?? "Restore failed.";
    }
    await onRestored();
    await load();
    return null;
  };

  // Group by day, newest first; word delta is against the next-older revision.
  const groups: [string, (Revision & { delta: number | null })[]][] = [];
  (revisions ?? []).forEach((r, i, all) => {
    const label = dayLabel(r.created_at);
    const older = all[i + 1];
    const item = { ...r, delta: older ? r.word_count - older.word_count : null };
    const last = groups[groups.length - 1];
    if (last?.[0] === label) last[1].push(item);
    else groups.push([label, [item]]);
  });

  return (
    <>
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
                <History style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
                <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Revision History</span>
              </div>
              <button onClick={onClose} style={iconButton}><X style={{ width: "14px", height: "14px" }} /></button>
            </div>

            {/* Save a named revision */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: "6px" }}>
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !saving) void saveRevision(); }}
                  placeholder="Name this version, e.g. “First draft”"
                  style={{ flex: 1, minWidth: 0, background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", outline: "none", padding: "6px 8px", fontSize: "12px", fontFamily: "var(--font-inter)" }}
                />
                <button
                  onClick={() => void saveRevision()}
                  disabled={saving}
                  className="btn-gold"
                  style={{ padding: "6px 10px", fontSize: "12px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", flexShrink: 0 }}>
                  {saving ? <Loader2 className="animate-spin" style={{ width: "12px", height: "12px" }} /> : <Bookmark style={{ width: "12px", height: "12px" }} />}
                  Save
                </button>
              </div>
              <p style={{ margin: "8px 0 0", fontFamily: "var(--font-inter)", fontSize: "11px", color: error ? "#ef4444" : "var(--text-dim)", lineHeight: 1.5 }}>
                {error ?? "A version is also saved automatically every 10 minutes while you write."}
              </p>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
              {revisions === null ? (
                <div style={{ display: "flex", justifyContent: "center", padding: "32px" }}>
                  <Loader2 className="animate-spin" style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
                </div>
              ) : revisions.length === 0 ? (
                <p style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "var(--text-dim)", padding: "8px 16px", lineHeight: 1.6 }}>
                  No revisions yet. The first auto-save happens 10 minutes after you start writing, or save one now above.
                </p>
              ) : (
                groups.map(([day, items]) => (
                  <div key={day} style={{ marginBottom: "8px" }}>
                    <p style={{ margin: "4px 0", padding: "0 16px", fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)" }}>{day}</p>
                    {items.map((r) => (
                      <div
                        key={r.id}
                        className="group"
                        onClick={() => { if (renaming !== r.id && confirmDelete !== r.id) setPreviewing(r); }}
                        style={{ display: "flex", alignItems: "center", gap: "8px", padding: "7px 12px 7px 16px", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <span style={{ flexShrink: 0, display: "flex", color: r.kind === "auto" ? "var(--text-dim)" : "var(--gold-primary)" }}>
                          {r.kind === "backup" ? <ShieldCheck style={{ width: "12px", height: "12px" }} />
                            : r.kind === "manual" ? <Bookmark style={{ width: "12px", height: "12px" }} />
                            : <History style={{ width: "12px", height: "12px" }} />}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          {renaming === r.id ? (
                            <input
                              autoFocus
                              value={draft}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => setDraft(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") void rename(r.id); if (e.key === "Escape") setRenaming(null); }}
                              onBlur={() => void rename(r.id)}
                              placeholder="Revision name"
                              style={{ width: "100%", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--gold-border)", outline: "none", padding: "2px 6px", fontSize: "12.5px", fontFamily: "var(--font-inter)" }}
                            />
                          ) : (
                            <div style={{ fontFamily: "var(--font-inter)", fontSize: "12.5px", fontWeight: r.name ? 600 : 400, color: r.name ? "var(--text-primary)" : "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {defaultTitle(r)}
                            </div>
                          )}
                          <div style={{ fontFamily: "var(--font-inter)", fontSize: "10.5px", color: "var(--text-dim)" }}>
                            {timeLabel(r.created_at)} · {r.word_count.toLocaleString()} words
                            {r.delta !== null && r.delta !== 0 && (
                              <span style={{ color: r.delta > 0 ? "var(--gold-primary)" : "var(--text-muted)" }}>
                                {" "}({r.delta > 0 ? "+" : ""}{r.delta.toLocaleString()})
                              </span>
                            )}
                          </div>
                        </div>
                        {confirmDelete === r.id ? (
                          <div style={{ display: "flex", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
                            <button title="Confirm delete" onClick={() => void remove(r.id)} style={{ ...iconButton, color: "#ef4444" }}><Check style={{ width: "12px", height: "12px" }} /></button>
                            <button title="Cancel" onClick={() => setConfirmDelete(null)} style={iconButton}><X style={{ width: "12px", height: "12px" }} /></button>
                          </div>
                        ) : (
                          <div className="opacity-0 group-hover:opacity-100" style={{ display: "flex", gap: "2px" }} onClick={(e) => e.stopPropagation()}>
                            <button title={r.name ? "Rename" : "Name this revision"} onClick={() => { setRenaming(r.id); setDraft(r.name ?? ""); }} style={iconButton}><Pencil style={{ width: "11px", height: "11px" }} /></button>
                            <button title="Delete" onClick={() => setConfirmDelete(r.id)} style={iconButton}><Trash2 style={{ width: "11px", height: "11px" }} /></button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {previewing && (
        <Preview
          documentId={documentId}
          revision={previewing}
          onClose={() => setPreviewing(null)}
          onRestore={() => restore(previewing)}
        />
      )}
    </>
  );
}
