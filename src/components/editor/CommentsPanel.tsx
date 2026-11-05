"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, MessageSquare, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { buildChapterTree, flattenChapterTree, type Chapter } from "@/lib/chapters";
import type { ChapterComment } from "@/lib/comments";
import type { CommentsApi } from "@/hooks/useComments";

interface CommentsPanelProps {
  api: CommentsApi;
  chapters: Chapter[];
  activeChapterId: string | null;
  activeCommentId: string | null;
  /** Comment ids whose text is in the open chapter (others there were deleted). */
  presentIds: Set<string> | null;
  currentUserId: string | null;
  isOwner: boolean;
  onSelect: (comment: ChapterComment) => void;
  /** Called after a comment is deleted so its highlight can be removed. */
  onDeleted: (comment: ChapterComment) => void;
  /** Proofread mode is on (comments can be added and are highlighted). */
  proofreading: boolean;
  onStartProofreading: () => void;
  isOpen: boolean;
  onClose: () => void;
}

const iconButton: React.CSSProperties = {
  color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "3px",
};
const font = { fontFamily: "var(--font-inter)" } as const;

function timeAgo(iso: string): string {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function CommentCard({ comment, active, missing, canEdit, canDelete, api, onSelect, onDeleted }: {
  comment: ChapterComment;
  active: boolean;
  missing: boolean;
  canEdit: boolean;
  canDelete: boolean;
  api: CommentsApi;
  onSelect: () => void;
  onDeleted: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [active]);

  const save = async () => {
    const text = draft.trim();
    if (!text || text === comment.body) { setEditing(false); return; }
    const err = await api.update(comment.id, { body: text });
    if (err) setError(err);
    else setEditing(false);
  };

  const run = async (action: () => Promise<string | null>) => {
    setError(null);
    const err = await action();
    if (err) setError(err);
  };

  return (
    <div
      ref={ref}
      onClick={() => { if (!editing) onSelect(); }}
      style={{
        margin: "0 10px 8px", padding: "10px 10px 8px", cursor: "pointer",
        background: active ? "var(--gold-subtle)" : "var(--bg-primary)",
        border: `1px solid ${active ? "var(--gold-border)" : "var(--border-color)"}`,
        opacity: comment.resolved ? 0.75 : 1,
      }}>
      <p style={{ ...font, margin: "0 0 6px", fontSize: "11.5px", lineHeight: 1.45, fontStyle: "italic", color: "var(--text-muted)", borderLeft: "2px solid var(--gold-primary)", paddingLeft: "7px", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", textDecoration: missing ? "line-through" : undefined }}>
        {comment.quote || "(no text)"}
      </p>
      {missing && (
        <p style={{ ...font, margin: "0 0 6px", fontSize: "10.5px", color: "var(--text-dim)" }}>The commented text was deleted.</p>
      )}
      {editing ? (
        <div onClick={(e) => e.stopPropagation()}>
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setDraft(comment.body); setEditing(false); }
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save();
            }}
            rows={3}
            style={{ ...font, width: "100%", boxSizing: "border-box", resize: "vertical", background: "var(--bg-elevated)", color: "var(--text-primary)", border: "1px solid var(--gold-border)", outline: "none", padding: "6px 8px", fontSize: "12.5px", lineHeight: 1.5 }}
          />
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "4px" }}>
            <button onClick={() => { setDraft(comment.body); setEditing(false); }} style={{ ...iconButton, ...font, fontSize: "11.5px" }}>Cancel</button>
            <button onClick={() => void save()} className="btn-gold" style={{ padding: "3px 10px", fontSize: "11.5px", cursor: "pointer" }}>Save</button>
          </div>
        </div>
      ) : (
        <p style={{ ...font, margin: 0, fontSize: "12.5px", lineHeight: 1.55, color: "var(--text-primary)", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{comment.body}</p>
      )}
      {error && <p style={{ ...font, margin: "6px 0 0", fontSize: "11px", color: "#ef4444" }}>{error}</p>}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "6px" }} onClick={(e) => e.stopPropagation()}>
        <span style={{ ...font, flex: 1, minWidth: 0, fontSize: "10.5px", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {comment.authorName || "Someone"} · {timeAgo(comment.createdAt)}
        </span>
        {confirmDelete ? (
          <>
            <span style={{ ...font, fontSize: "10.5px", color: "var(--text-muted)" }}>Delete?</span>
            <button title="Confirm delete" onClick={() => void run(async () => {
              const err = await api.remove(comment.id);
              if (!err) onDeleted();
              return err;
            })} style={{ ...iconButton, color: "#ef4444" }}><Check style={{ width: "12px", height: "12px" }} /></button>
            <button title="Cancel" onClick={() => setConfirmDelete(false)} style={iconButton}><X style={{ width: "12px", height: "12px" }} /></button>
          </>
        ) : (
          <>
            <button
              title={comment.resolved ? "Reopen" : "Resolve"}
              onClick={() => void run(() => api.update(comment.id, { resolved: !comment.resolved }))}
              style={{ ...iconButton, color: comment.resolved ? "var(--text-dim)" : "var(--gold-primary)" }}>
              {comment.resolved ? <RotateCcw style={{ width: "12px", height: "12px" }} /> : <Check style={{ width: "13px", height: "13px" }} />}
            </button>
            {canEdit && (
              <button title="Edit" onClick={() => { setDraft(comment.body); setEditing(true); }} style={iconButton}>
                <Pencil style={{ width: "11px", height: "11px" }} />
              </button>
            )}
            {canDelete && (
              <button title="Delete" onClick={() => setConfirmDelete(true)} style={iconButton}>
                <Trash2 style={{ width: "11px", height: "11px" }} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function CommentsPanel({
  api, chapters, activeChapterId, activeCommentId, presentIds, currentUserId, isOwner,
  onSelect, onDeleted, proofreading, onStartProofreading, isOpen, onClose,
}: CommentsPanelProps) {
  const [filter, setFilter] = useState<"open" | "resolved">("open");

  // Refresh when opened, in case collaborators added comments.
  const { reload } = api;
  useEffect(() => { if (isOpen) void reload(); }, [isOpen, reload]);

  // Show the tab the selected comment is in.
  const activeComment = api.comments.find((c) => c.id === activeCommentId);
  const [shownFor, setShownFor] = useState<string | null>(null);
  if (activeComment && activeComment.id !== shownFor) {
    setShownFor(activeComment.id);
    setFilter(activeComment.resolved ? "resolved" : "open");
  }

  const groups = useMemo(() => {
    const ordered = flattenChapterTree(buildChapterTree(chapters));
    const visible = api.comments.filter((c) => (filter === "open" ? !c.resolved : c.resolved));
    const result = ordered
      .map((ch) => ({ chapter: ch as Chapter | null, items: visible.filter((c) => c.chapterId === ch.id) }))
      .filter((g) => g.items.length > 0);
    const known = new Set(ordered.map((c) => c.id));
    const orphans = visible.filter((c) => !known.has(c.chapterId));
    if (orphans.length) result.push({ chapter: null, items: orphans });
    return result;
  }, [api.comments, chapters, filter]);

  const openCount = api.comments.filter((c) => !c.resolved).length;
  const resolvedCount = api.comments.length - openCount;

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
              <MessageSquare style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>Comments</span>
            </div>
            <button onClick={onClose} style={iconButton} title="Close"><X style={{ width: "14px", height: "14px" }} /></button>
          </div>

          <div role="tablist" style={{ display: "flex", gap: "4px", padding: "10px 12px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
            {([["open", `Open (${openCount})`], ["resolved", `Resolved (${resolvedCount})`]] as const).map(([key, label]) => (
              <button key={key} role="tab" aria-selected={filter === key} onClick={() => setFilter(key)}
                style={{ ...font, flex: 1, padding: "5px 8px", fontSize: "12px", cursor: "pointer", border: "1px solid var(--border-color)", background: filter === key ? "var(--bg-elevated)" : "transparent", color: filter === key ? "var(--text-primary)" : "var(--text-muted)" }}>
                {label}
              </button>
            ))}
          </div>

          {!proofreading && (
            <div style={{ ...font, padding: "10px 16px", borderBottom: "1px solid var(--border-color)", background: "var(--bg-elevated)", flexShrink: 0 }}>
              <p style={{ margin: "0 0 8px", fontSize: "12px", lineHeight: 1.55, color: "var(--text-muted)" }}>
                You&apos;re in Edit mode. Switch to Proofread mode to add comments and see them highlighted in your text.
              </p>
              <button onClick={onStartProofreading} className="btn-gold"
                style={{ padding: "5px 12px", fontSize: "12px", cursor: "pointer" }}>
                Turn on Proofread mode
              </button>
            </div>
          )}

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
            {groups.length === 0 ? (
              <div style={{ ...font, padding: "12px 16px", fontSize: "12px", lineHeight: 1.65, color: "var(--text-dim)" }}>
                {filter === "open" ? (
                  <>
                    <p style={{ margin: "0 0 8px" }}>No open comments.</p>
                    <p style={{ margin: 0 }}>
                      In <strong style={{ color: "var(--text-muted)" }}>Proofread mode</strong> (switch in the editor toolbar),
                      {" "}<strong style={{ color: "var(--text-muted)" }}>double-click a sentence</strong>, or select a passage and click
                      {" "}<strong style={{ color: "var(--text-muted)" }}>Comment</strong>, to leave yourself a note to come back to.
                      Shortcut: ⌘⌥M.
                    </p>
                  </>
                ) : (
                  <p style={{ margin: 0 }}>No resolved comments yet. Resolve a comment with ✓ once you&apos;ve dealt with it.</p>
                )}
              </div>
            ) : (
              groups.map(({ chapter, items }) => (
                <div key={chapter?.id ?? "orphans"} style={{ marginBottom: "6px" }}>
                  <p style={{ ...font, margin: "6px 0 6px", padding: "0 16px", fontSize: "10px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: chapter?.id === activeChapterId ? "var(--gold-primary)" : "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {chapter ? chapter.title || "Untitled" : "Deleted chapters"}
                    {chapter?.id === activeChapterId && " · open"}
                  </p>
                  {items.map((c) => (
                    <CommentCard
                      key={`${c.id}-${c.updatedAt}`}
                      comment={c}
                      active={c.id === activeCommentId}
                      missing={!!presentIds && c.chapterId === activeChapterId && !presentIds.has(c.id)}
                      canEdit={c.userId === currentUserId}
                      canDelete={c.userId === currentUserId || isOwner}
                      api={api}
                      onSelect={() => onSelect(c)}
                      onDeleted={() => onDeleted(c)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
