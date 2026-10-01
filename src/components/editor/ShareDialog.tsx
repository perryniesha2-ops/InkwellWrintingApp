"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Copy, Eye, Link2, Loader2, PenLine, Share2, Trash2, UserMinus, X } from "lucide-react";
import { buildChapterTree, flattenChapterTree, type Chapter } from "@/lib/chapters";

interface ShareLink { id: string; token: string; chapter_id: string | null; role: "view" | "edit"; created_at: string }
interface Member { id: string; email: string | null; chapter_id: string | null }

const label: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "6px",
};
const small: React.CSSProperties = {
  background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px",
  padding: "3px", color: "var(--text-dim)", fontFamily: "var(--font-inter)", fontSize: "11px",
};

const linkUrl = (token: string) => `${window.location.origin}/share/${token}`;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      title="Copy link"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      style={{ ...small, color: copied ? "var(--gold-primary)" : "var(--text-dim)" }}>
      {copied ? <Check style={{ width: "12px", height: "12px" }} /> : <Copy style={{ width: "12px", height: "12px" }} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function ShareDialog({ documentId, chapters, onClose }: {
  documentId: string;
  chapters: Chapter[];
  onClose: () => void;
}) {
  const [role, setRole] = useState<"view" | "edit">("view");
  const [scope, setScope] = useState<string>("");
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [creating, setCreating] = useState(false);
  const [fresh, setFresh] = useState<ShareLink | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ordered = flattenChapterTree(buildChapterTree(chapters));
  const chapterTitle = (cid: string | null) =>
    cid ? `“${chapters.find((c) => c.id === cid)?.title ?? "a deleted chapter"}”` : "Whole book";

  useEffect(() => {
    fetch(`/api/documents/${documentId}/shares`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data: { links: ShareLink[]; members: Member[] }) => {
        setLinks(data.links);
        setMembers(data.members);
      })
      .catch(() => setError("Couldn't load sharing settings."));
  }, [documentId]);

  const createLink = async () => {
    setCreating(true);
    setError(null);
    const res = await fetch(`/api/documents/${documentId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, chapterId: scope || null }),
    });
    setCreating(false);
    if (!res.ok) { setError("Couldn't create the link."); return; }
    const link = (await res.json()) as ShareLink;
    setFresh(link);
    setLinks((prev) => [link, ...(prev ?? [])]);
  };

  const revoke = async (linkId: string) => {
    setConfirming(null);
    const res = await fetch(`/api/documents/${documentId}/shares/${linkId}`, { method: "DELETE" });
    if (res.ok) {
      setLinks((prev) => prev?.filter((l) => l.id !== linkId) ?? null);
      if (fresh?.id === linkId) setFresh(null);
    }
  };

  const removeMember = async (memberId: string) => {
    setConfirming(null);
    const res = await fetch(`/api/documents/${documentId}/members/${memberId}`, { method: "DELETE" });
    if (res.ok) setMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "min(560px, 100%)", maxHeight: "100%", overflowY: "auto", background: "var(--bg-surface)", border: "1px solid var(--border-color)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 20px", height: "52px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Share2 style={{ width: "15px", height: "15px", color: "var(--gold-primary)" }} />
            <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Share</span>
          </div>
          <button onClick={onClose} style={{ ...small, padding: "4px" }}><X style={{ width: "15px", height: "15px" }} /></button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px", borderBottom: "1px solid var(--border-color)" }}>
          <div>
            <span style={label}>What to share</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              style={{ width: "100%", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", outline: "none", padding: "7px 9px", fontSize: "13px", fontFamily: "var(--font-inter)" }}>
              <option value="">The whole book</option>
              {ordered.map((c) => (
                <option key={c.id} value={c.id}>{c.parent_id ? "    " : ""}{c.title || "Untitled"}{!c.parent_id && chapters.some((s) => s.parent_id === c.id) ? " (with its scenes)" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={label}>Access</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {([
                ["view", Eye, "Can view", "Anyone with the link can read it. No account needed."],
                ["edit", PenLine, "Can edit", "They sign in, then write with you in real time."],
              ] as const).map(([value, Icon, title, desc]) => (
                <label key={value} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 10px", cursor: "pointer", border: `1px solid ${role === value ? "var(--gold-border)" : "var(--border-color)"}`, background: role === value ? "var(--gold-subtle)" : "transparent" }}>
                  <input type="radio" name="share-role" checked={role === value} onChange={() => setRole(value)} style={{ marginTop: "3px", accentColor: "var(--gold-primary)" }} />
                  <Icon style={{ width: "14px", height: "14px", color: "var(--text-muted)", marginTop: "2px", flexShrink: 0 }} />
                  <span>
                    <span style={{ display: "block", fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{title}</span>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: "11.5px", color: "var(--text-dim)" }}>{desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
          <button onClick={() => void createLink()} disabled={creating} className="btn-gold" style={{ alignSelf: "flex-start", padding: "8px 14px", fontSize: "13px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            {creating ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <Link2 style={{ width: "13px", height: "13px" }} />}
            Create link
          </button>
          {fresh && (
            <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", background: "var(--bg-primary)", border: "1px solid var(--gold-border)" }}>
              <code style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "12px", color: "var(--text-secondary)" }}>{linkUrl(fresh.token)}</code>
              <CopyButton text={linkUrl(fresh.token)} />
            </div>
          )}
          {error && <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: "12px", color: "#ef4444" }}>{error}</p>}
        </div>

        <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div>
            <span style={label}>Active links</span>
            {links === null ? (
              <Loader2 className="animate-spin" style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
            ) : links.length === 0 ? (
              <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: "12px", color: "var(--text-dim)" }}>No links yet.</p>
            ) : links.map((l) => (
              <div key={l.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderTop: "1px solid var(--border-color)" }}>
                {l.role === "edit" ? <PenLine style={{ width: "12px", height: "12px", color: "var(--gold-primary)" }} /> : <Eye style={{ width: "12px", height: "12px", color: "var(--text-dim)" }} />}
                <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-inter)", fontSize: "12.5px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {l.role === "edit" ? "Can edit" : "Can view"} · {chapterTitle(l.chapter_id)}
                </span>
                <CopyButton text={linkUrl(l.token)} />
                {confirming === l.id ? (
                  <>
                    <button onClick={() => void revoke(l.id)} style={{ ...small, color: "#ef4444" }}>Revoke</button>
                    <button onClick={() => setConfirming(null)} style={small}>Keep</button>
                  </>
                ) : (
                  <button title="Revoke link" onClick={() => setConfirming(l.id)} style={small}><Trash2 style={{ width: "12px", height: "12px" }} /></button>
                )}
              </div>
            ))}
          </div>
          <div>
            <span style={label}>Collaborators</span>
            {members.length === 0 ? (
              <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: "12px", color: "var(--text-dim)" }}>
                People who open a “Can edit” link appear here.
              </p>
            ) : members.map((m) => (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 0", borderTop: "1px solid var(--border-color)" }}>
                <span style={{ flex: 1, minWidth: 0, fontFamily: "var(--font-inter)", fontSize: "12.5px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.email ?? "Collaborator"} · {chapterTitle(m.chapter_id)}
                </span>
                {confirming === m.id ? (
                  <>
                    <button onClick={() => void removeMember(m.id)} style={{ ...small, color: "#ef4444" }}>Remove</button>
                    <button onClick={() => setConfirming(null)} style={small}>Keep</button>
                  </>
                ) : (
                  <button title="Remove collaborator" onClick={() => setConfirming(m.id)} style={small}><UserMinus style={{ width: "12px", height: "12px" }} /></button>
                )}
              </div>
            ))}
          </div>
          <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: "11px", lineHeight: 1.5, color: "var(--text-dim)" }}>
            Revoking a link stops new people from using it. To take away someone&apos;s editing access, remove them as a collaborator.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
