"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  collapseUnchanged, diffVersions, type ChapterDiff, type VersionChapter,
} from "@/lib/versionDiff";

export interface CompareRevision {
  id: string;
  name: string | null;
  kind: "auto" | "manual" | "backup";
  created_at: string;
}

interface VersionCompareProps {
  documentId: string;
  revision: CompareRevision;
  /** Every revision of the book, newest first (offered as comparison targets). */
  revisions: CompareRevision[];
  /** Flush unsaved edits so "Current draft" is up to date. */
  flushSave: () => Promise<void>;
}

const CURRENT = "current";

const fullLabel = (iso: string) =>
  new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const revisionLabel = (r: CompareRevision) =>
  r.name ? `${r.name} (${fullLabel(r.created_at)})` : fullLabel(r.created_at);

const STATUS_STYLE: Record<ChapterDiff["status"], { label: string; color: string }> = {
  added: { label: "New", color: "#22c55e" },
  removed: { label: "Removed", color: "#ef4444" },
  changed: { label: "Edited", color: "var(--gold-primary)" },
  unchanged: { label: "No changes", color: "var(--text-dim)" },
};

const small: React.CSSProperties = { fontFamily: "var(--font-inter)", fontSize: "12px" };

export default function VersionCompare({ documentId, revision, revisions, flushSave }: VersionCompareProps) {
  const [target, setTarget] = useState<string>(CURRENT);
  const [diffs, setDiffs] = useState<ChapterDiff[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showUnchanged, setShowUnchanged] = useState(false);
  const snapshots = useRef(new Map<string, VersionChapter[]>());

  const others = revisions.filter((r) => r.id !== revision.id);
  const targetRevision = others.find((r) => r.id === target);
  // Always diff older → newer so additions read as additions.
  const thisIsOlder = !targetRevision || revision.created_at <= targetRevision.created_at;

  useEffect(() => {
    let cancelled = false;

    const loadRevision = async (id: string) => {
      const cached = snapshots.current.get(id);
      if (cached) return cached;
      const res = await fetch(`/api/documents/${documentId}/revisions/${id}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { snapshot: { chapters: VersionChapter[] } };
      snapshots.current.set(id, data.snapshot.chapters ?? []);
      return data.snapshot.chapters ?? [];
    };
    const loadCurrent = async () => {
      await flushSave();
      const res = await fetch(`/api/documents/${documentId}/chapters`);
      if (!res.ok) throw new Error();
      return (await res.json()) as VersionChapter[];
    };

    Promise.all([loadRevision(revision.id), target === CURRENT ? loadCurrent() : loadRevision(target)])
      .then(([mine, theirs]) => {
        if (cancelled) return;
        setDiffs(thisIsOlder ? diffVersions(mine, theirs) : diffVersions(theirs, mine));
      })
      .catch(() => { if (!cancelled) setError("Couldn't load these versions to compare."); });
    return () => { cancelled = true; };
    // flushSave is recreated by the editor on every render; only refetch on selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, revision.id, target, thisIsOlder]);

  const totals = useMemo(() => {
    const t = { added: 0, removed: 0, changed: 0 };
    for (const d of diffs ?? []) {
      t.added += d.wordsAdded;
      t.removed += d.wordsRemoved;
      if (d.status !== "unchanged") t.changed += 1;
    }
    return t;
  }, [diffs]);

  const thisLabel = revisionLabel(revision);
  const targetLabel = targetRevision ? revisionLabel(targetRevision) : "Current draft";
  const [fromLabel, toLabel] = thisIsOlder ? [thisLabel, targetLabel] : [targetLabel, thisLabel];
  const visible = (diffs ?? []).filter((d) => showUnchanged || d.status !== "unchanged");
  const unchangedCount = (diffs ?? []).length - totals.changed;

  return (
    <div style={{ maxWidth: "720px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
        <label htmlFor="compare-target" style={{ ...small, color: "var(--text-muted)" }}>Compare with</label>
        <select
          id="compare-target"
          value={target}
          onChange={(e) => { setTarget(e.target.value); setDiffs(null); setError(null); }}
          style={{ ...small, flex: "1 1 220px", minWidth: 0, background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", padding: "5px 6px", outline: "none" }}>
          <option value={CURRENT}>Current draft</option>
          {others.map((r) => (
            <option key={r.id} value={r.id}>{revisionLabel(r)}</option>
          ))}
        </select>
      </div>
      <p style={{ ...small, color: "var(--text-dim)", margin: "0 0 16px" }}>
        Changes from <strong style={{ color: "var(--text-secondary)" }}>{fromLabel}</strong> to{" "}
        <strong style={{ color: "var(--text-secondary)" }}>{toLabel}</strong>
      </p>

      {error ? (
        <p style={{ ...small, color: "#ef4444" }}>{error}</p>
      ) : diffs === null ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
          <Loader2 className="animate-spin" style={{ width: "18px", height: "18px", color: "var(--gold-primary)" }} />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", padding: "10px 12px", marginBottom: "16px", border: "1px solid var(--border-color)", background: "var(--bg-primary)" }}>
            <span style={{ ...small, color: "#22c55e", fontWeight: 600 }}>+{totals.added.toLocaleString()} words</span>
            <span style={{ ...small, color: "#ef4444", fontWeight: 600 }}>−{totals.removed.toLocaleString()} words</span>
            <span style={{ ...small, color: "var(--text-muted)" }}>
              {totals.changed} of {diffs.length} {diffs.length === 1 ? "chapter" : "chapters"} changed
            </span>
            {unchangedCount > 0 && (
              <label style={{ ...small, color: "var(--text-muted)", marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
                <input type="checkbox" checked={showUnchanged} onChange={(e) => setShowUnchanged(e.target.checked)} />
                Show unchanged
              </label>
            )}
          </div>

          {visible.length === 0 ? (
            <p style={{ ...small, color: "var(--text-dim)", textAlign: "center", padding: "32px 0" }}>
              These versions are identical.
            </p>
          ) : (
            visible.map((d) => <ChapterDiffCard key={d.id} diff={d} />)
          )}
        </>
      )}
    </div>
  );
}

function ChapterDiffCard({ diff }: { diff: ChapterDiff }) {
  const status = STATUS_STYLE[diff.status];
  const parts = diff.status === "changed" ? collapseUnchanged(diff.parts) : diff.parts;

  return (
    <section style={{ marginBottom: "18px", marginLeft: diff.isSubchapter ? "16px" : 0, border: "1px solid var(--border-color)" }}>
      <header style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap", padding: "8px 12px", borderBottom: diff.status === "unchanged" ? "none" : "1px solid var(--border-color)", background: "var(--bg-elevated)" }}>
        <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13.5px", color: "var(--text-primary)", minWidth: 0, overflowWrap: "anywhere" }}>
          {diff.oldTitle !== undefined && (
            <del style={{ color: "var(--text-dim)", fontWeight: 400, marginRight: "6px" }}>{diff.oldTitle || "Untitled"}</del>
          )}
          {diff.title || "Untitled"}
        </span>
        <span style={{ ...small, fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: status.color }}>{status.label}</span>
        {(diff.wordsAdded > 0 || diff.wordsRemoved > 0) && (
          <span style={{ ...small, fontSize: "11px", color: "var(--text-dim)", marginLeft: "auto" }}>
            {diff.wordsAdded > 0 && <span style={{ color: "#22c55e" }}>+{diff.wordsAdded.toLocaleString()}</span>}
            {diff.wordsAdded > 0 && diff.wordsRemoved > 0 && " "}
            {diff.wordsRemoved > 0 && <span style={{ color: "#ef4444" }}>−{diff.wordsRemoved.toLocaleString()}</span>}
          </span>
        )}
      </header>
      {diff.status !== "unchanged" && (
        <div style={{ padding: "12px 14px", whiteSpace: "pre-wrap", overflowWrap: "anywhere", fontFamily: "var(--editor-font-family, Georgia, serif)", fontSize: "14.5px", lineHeight: 1.7, color: "var(--text-secondary)" }}>
          {parts.length === 0 ? (
            <span style={{ ...small, color: "var(--text-dim)" }}>(empty chapter)</span>
          ) : (
            parts.map((p, i) =>
              p.added ? (
                <ins key={i} style={{ textDecoration: "none", background: "rgba(34,197,94,0.2)", color: "var(--text-primary)" }}>{p.value}</ins>
              ) : p.removed ? (
                <del key={i} style={{ background: "rgba(239,68,68,0.16)", color: "var(--text-muted)" }}>{p.value}</del>
              ) : "collapsed" in p && p.collapsed ? (
                <span key={i} style={{ color: "var(--text-dim)" }}>{p.value}</span>
              ) : (
                <span key={i}>{p.value}</span>
              ),
            )
          )}
        </div>
      )}
    </section>
  );
}
