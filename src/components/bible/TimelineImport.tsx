"use client";

import { useRef, useState } from "react";
import { FileUp, Loader2, MapPin, Users } from "lucide-react";
import { readDocxHtml } from "@/lib/outlineDocs";
import { docBlocks, parseTimeline, type ImportedEvent, type StoryBibleNames, type TimelineParse } from "@/lib/timelineImport";

export interface TimelineDraft {
  fileName: string;
  events: ImportedEvent[];
  source: NonNullable<TimelineParse["source"]>;
}

const DOCX_ACCEPT = ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc";

/** "Import Timeline (.docx)": reads the file and hands back the events it found. */
export function TimelineImportButton({ names, onParsed }: { names: StoryBibleNames; onParsed: (draft: TimelineDraft) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const read = async (file: File) => {
    setReading(true);
    setError(null);
    try {
      const { html } = await readDocxHtml(file);
      const { events, source } = parseTimeline(docBlocks(html), names);
      if (!source || !events.length) {
        throw new Error(
          "Couldn't find a timeline in that document. Put it in a table with columns like When and What happens, or write one line per event, like “Day 1 – Sanai arrives”.",
        );
      }
      onParsed({ fileName: file.name, events, source });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setReading(false);
    }
  };

  return (
    <div style={{ padding: "0 8px 8px" }}>
      <input
        ref={fileRef}
        type="file"
        accept={DOCX_ACCEPT}
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void read(file);
        }}
      />
      <button
        onClick={() => fileRef.current?.click()}
        disabled={reading}
        title="Create events from a timeline you wrote in Word: a table with columns like When, Chapters and What happens"
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px",
          background: "transparent", border: "1px dashed var(--gold-border)", cursor: "pointer",
          color: "var(--gold-primary)", fontSize: "12px", fontFamily: "var(--font-inter)",
        }}>
        {reading ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <FileUp style={{ width: "13px", height: "13px" }} />}
        {reading ? "Reading…" : "Import Timeline (.docx)"}
      </button>
      {error && (
        <p role="alert" style={{ margin: "6px 2px 0", fontSize: "11px", fontFamily: "var(--font-inter)", color: "#ef4444", lineHeight: 1.5 }}>
          {error}
        </p>
      )}
    </div>
  );
}

const SOURCE_TEXT: Record<TimelineDraft["source"], string> = {
  table: "a table",
  lines: "lines like “Day 1 – …”",
  headings: "its headings",
};

const label: React.CSSProperties = {
  fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em",
  textTransform: "uppercase", color: "var(--text-dim)",
};
const inlineInput: React.CSSProperties = {
  width: "100%", background: "transparent", border: "1px solid transparent", outline: "none", padding: "2px 4px", margin: "0 -4px",
};

/** Review the events found in a document, then add them to the timeline. */
export function TimelineImportPreview({
  draft, bibleId, existingCount, onCancel, onImported,
}: {
  draft: TimelineDraft;
  bibleId: string;
  existingCount: number;
  onCancel: () => void;
  /** Rows as saved (snake_case), and whether they replaced the old events. */
  onImported: (rows: unknown[], replaced: boolean) => void;
}) {
  const [rows, setRows] = useState(() => draft.events.map((event) => ({ event, include: true })));
  const [replace, setReplace] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = rows.filter((r) => r.include);
  const edit = (i: number, patch: Partial<ImportedEvent>) =>
    setRows((list) => list.map((r, j) => (j === i ? { ...r, event: { ...r.event, ...patch } } : r)));
  const focusBorder = (e: React.FocusEvent<HTMLInputElement>, on: boolean) => {
    e.target.style.borderColor = on ? "var(--gold-border)" : "transparent";
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/bible/${bibleId}/timeline/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events: chosen.map((r) => r.event), replace }),
      });
      const data = (await res.json().catch(() => ({}))) as { events?: unknown[]; error?: string; warning?: string };
      if (!res.ok || !data.events) throw new Error(data.error ?? "The events couldn't be saved. Please try again.");
      if (data.warning) alert(data.warning);
      onImported(data.events, replace);
    } catch (err) {
      setError(err instanceof TypeError ? "Couldn't reach the server. Check your connection and try again." : (err as Error).message);
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", padding: "2rem 2rem 0", display: "flex", flexDirection: "column", minHeight: "100%" }}>
      <h2 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 4px" }}>
        Import timeline
      </h2>
      <p style={{ fontSize: "13px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", margin: "0 0 1.25rem", lineHeight: 1.6 }}>
        Found {draft.events.length} event{draft.events.length === 1 ? "" : "s"} in {SOURCE_TEXT[draft.source]} in <strong>{draft.fileName}</strong>.
        Untick anything you don&apos;t want and fix any titles, then add them. Characters and places from your Story Bible are linked when they&apos;re mentioned.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
        <label style={{ display: "flex", alignItems: "center", gap: "6px", ...label, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={chosen.length === rows.length}
            ref={(el) => {
              if (el) el.indeterminate = chosen.length > 0 && chosen.length < rows.length;
            }}
            onChange={(e) => setRows((list) => list.map((r) => ({ ...r, include: e.target.checked })))}
          />
          {chosen.length} of {rows.length} selected
        </label>
      </div>

      <div style={{ flex: 1 }}>
        {rows.map(({ event, include }, i) => (
          <div
            key={i}
            style={{
              display: "flex", gap: "12px", padding: "12px 14px", marginBottom: "8px",
              background: "var(--bg-elevated)", border: "1px solid var(--border-color)",
              borderLeft: `3px solid ${include ? "var(--gold-primary)" : "var(--border-color)"}`,
              opacity: include ? 1 : 0.5,
            }}>
            <input
              type="checkbox"
              checked={include}
              aria-label={`Include “${event.title}”`}
              onChange={(e) => setRows((list) => list.map((r, j) => (j === i ? { ...r, include: e.target.checked } : r)))}
              style={{ marginTop: "4px", flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "10px" }}>
                <input
                  value={event.timeLabel}
                  onChange={(e) => edit(i, { timeLabel: e.target.value })}
                  onFocus={(e) => focusBorder(e, true)}
                  onBlur={(e) => focusBorder(e, false)}
                  aria-label="When"
                  placeholder="When"
                  style={{ ...inlineInput, flex: 1, fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "12px", color: "var(--gold-primary)" }}
                />
                {event.chapterRef && (
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", whiteSpace: "nowrap", flexShrink: 0 }}>
                    {event.chapterRef}
                  </span>
                )}
              </div>
              <input
                value={event.title}
                onChange={(e) => edit(i, { title: e.target.value })}
                onFocus={(e) => focusBorder(e, true)}
                onBlur={(e) => focusBorder(e, false)}
                aria-label="Event title"
                style={{ ...inlineInput, fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "13.5px", color: "var(--text-primary)" }}
              />
              {event.description && event.description.replace(/[.!?]+$/, "") !== event.title.replace(/[.!?]+$/, "") && (
                <p style={{ margin: "2px 0 0", fontSize: "12.5px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {event.description}
                </p>
              )}
              {(event.location || event.characters.length > 0) && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "6px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                  {event.location && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <MapPin style={{ width: "11px", height: "11px" }} /> {event.location}
                    </span>
                  )}
                  {event.characters.length > 0 && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <Users style={{ width: "11px", height: "11px" }} /> {event.characters.join(", ")}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ position: "sticky", bottom: 0, background: "var(--bg-primary)", borderTop: "1px solid var(--border-color)", padding: "14px 0 18px", marginTop: "8px" }}>
        {existingCount > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "12px", fontSize: "12.5px", fontFamily: "var(--font-inter)", color: "var(--text-secondary)" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input type="radio" name="timeline-import-mode" checked={!replace} onChange={() => setReplace(false)} />
              Add after your {existingCount} existing event{existingCount === 1 ? "" : "s"}
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", color: replace ? "#ef4444" : undefined }}>
              <input type="radio" name="timeline-import-mode" checked={replace} onChange={() => setReplace(true)} />
              Replace your {existingCount} existing event{existingCount === 1 ? "" : "s"}
            </label>
          </div>
        )}
        {error && (
          <p role="alert" style={{ margin: "0 0 10px", fontSize: "12px", fontFamily: "var(--font-inter)", color: "#ef4444" }}>{error}</p>
        )}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => void save()}
            disabled={saving || chosen.length === 0}
            style={{
              display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", border: "none",
              background: "var(--gold-primary)", color: "var(--bg-primary)", cursor: chosen.length ? "pointer" : "not-allowed",
              fontSize: "12.5px", fontFamily: "var(--font-inter)", fontWeight: 600, opacity: saving || !chosen.length ? 0.6 : 1,
            }}>
            {saving && <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} />}
            {replace ? "Replace with" : "Add"} {chosen.length} event{chosen.length === 1 ? "" : "s"}
          </button>
          <button
            onClick={onCancel}
            disabled={saving}
            style={{ padding: "8px 14px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer", fontSize: "12.5px", fontFamily: "var(--font-inter)", fontWeight: 600 }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
