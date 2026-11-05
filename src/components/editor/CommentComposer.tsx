"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageSquarePlus } from "lucide-react";
import type { Editor } from "@tiptap/react";

const BOX_WIDTH = 300;

/** Viewport position just below `pos`, kept on screen and updated on scroll. */
function useAnchor(editor: Editor, pos: number) {
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    const update = () => {
      if (editor.isDestroyed) return;
      const safe = Math.min(pos, editor.state.doc.content.size);
      const c = editor.view.coordsAtPos(safe);
      setAnchor({
        top: Math.min(c.bottom + 8, window.innerHeight - 40),
        left: Math.max(16, Math.min(c.left - 24, window.innerWidth - BOX_WIDTH - 16)),
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [editor, pos]);
  return anchor;
}

const card: React.CSSProperties = {
  position: "fixed", zIndex: 60, background: "var(--bg-elevated)", border: "1px solid var(--border-color)",
  boxShadow: "0 12px 32px rgba(0,0,0,0.35)", fontFamily: "var(--font-inter)",
};

/** Small button offered next to a selected passage. */
export function CommentChip({ editor, pos, onClick }: { editor: Editor; pos: number; onClick: () => void }) {
  const anchor = useAnchor(editor, pos);
  if (!anchor) return null;
  return createPortal(
    <button
      // Keep the editor's selection: don't take focus on press.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title="Add a comment (⌘⌥M)"
      style={{ ...card, top: anchor.top, left: anchor.left, display: "flex", alignItems: "center", gap: "6px", padding: "5px 10px", fontSize: "12px", color: "var(--text-primary)", cursor: "pointer" }}>
      <MessageSquarePlus style={{ width: "13px", height: "13px", color: "var(--gold-primary)" }} />
      Comment
    </button>,
    document.body,
  );
}

/** Floating box for writing a new comment on the selected text. */
export default function CommentComposer({ editor, pos, quote, onSubmit, onCancel }: {
  editor: Editor;
  pos: number;
  quote: string;
  /** Resolves to an error message, or null on success. */
  onSubmit: (body: string) => Promise<string | null>;
  onCancel: () => void;
}) {
  const anchor = useAnchor(editor, pos);
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close when clicking elsewhere. Start listening on the next tick so the
  // click that opened the box can't also close it.
  const onCancelRef = useRef(onCancel);
  useEffect(() => { onCancelRef.current = onCancel; });
  useEffect(() => {
    if (saving) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) onCancelRef.current();
    };
    const timer = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onDown);
    };
  }, [saving]);

  const submit = async () => {
    if (!body.trim() || saving) return;
    setSaving(true);
    setError(null);
    const err = await onSubmit(body.trim());
    setSaving(false);
    if (err) setError(err);
  };

  if (!anchor) return null;
  return createPortal(
    <div ref={boxRef} role="dialog" aria-label="Add a comment"
      style={{ ...card, top: anchor.top, left: anchor.left, width: BOX_WIDTH, padding: "10px" }}>
      <p style={{ margin: "0 0 8px", fontSize: "11.5px", lineHeight: 1.5, color: "var(--text-muted)", fontStyle: "italic", borderLeft: "2px solid var(--gold-primary)", paddingLeft: "8px", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
        {quote}
      </p>
      <textarea
        autoFocus
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void submit(); }
        }}
        placeholder="Add a comment…"
        rows={3}
        style={{ width: "100%", boxSizing: "border-box", resize: "vertical", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", outline: "none", padding: "7px 8px", fontSize: "13px", lineHeight: 1.5, fontFamily: "var(--font-inter)" }}
      />
      {error && <p style={{ margin: "6px 0 0", fontSize: "11.5px", color: "#ef4444" }}>{error}</p>}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "8px", marginTop: "8px" }}>
        <span style={{ marginRight: "auto", fontSize: "10.5px", color: "var(--text-dim)" }}>⌘↵ to save</span>
        <button onClick={onCancel} disabled={saving}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
          Cancel
        </button>
        <button onClick={() => void submit()} disabled={!body.trim() || saving} className="btn-gold"
          style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 12px", fontSize: "12px", cursor: body.trim() ? "pointer" : "default", opacity: body.trim() ? 1 : 0.6 }}>
          {saving && <Loader2 className="animate-spin" style={{ width: "11px", height: "11px" }} />}
          Comment
        </button>
      </div>
    </div>,
    document.body,
  );
}
