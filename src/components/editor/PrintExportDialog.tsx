"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Printer, X } from "lucide-react";
import { FONT_LABELS, PRESETS, type ExportFormat, type FontId, type PresetId } from "@/lib/export/presets";

const STORAGE_KEY = "prosr-print-export";

interface Saved {
  preset: PresetId;
  format: ExportFormat;
  font: FontId;
  author: string;
  contact: string;
  frontMatter: boolean;
  sceneTitles: boolean;
}

function loadSaved(): Saved {
  const fallback: Saved = { preset: "kdp-6x9", format: "pdf", font: "garamond", author: "", contact: "", frontMatter: true, sceneTitles: false };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...fallback, ...(JSON.parse(raw) as Partial<Saved>) } : fallback;
  } catch {
    return fallback;
  }
}

const label: React.CSSProperties = {
  display: "block", fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "6px",
};
const input: React.CSSProperties = {
  width: "100%", background: "var(--bg-primary)", color: "var(--text-primary)", border: "1px solid var(--border-color)",
  outline: "none", padding: "7px 9px", fontSize: "13px", fontFamily: "var(--font-inter)",
};

export default function PrintExportDialog({ documentId, onClose }: { documentId: string; onClose: () => void }) {
  const [opts, setOpts] = useState<Saved>(loadSaved);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preset = PRESETS.find((p) => p.id === opts.preset) ?? PRESETS[0];
  const font = preset.fonts.includes(opts.font) ? opts.font : preset.fonts[0];
  const set = (patch: Partial<Saved>) => setOpts((o) => ({ ...o, ...patch }));

  const runExport = async () => {
    setExporting(true);
    setError(null);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...opts, font }));
    } catch { /* ignore */ }
    try {
      const res = await fetch(`/api/documents/${documentId}/export/manuscript`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...opts, font }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Export failed.");
      }
      const filename = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? `manuscript.${opts.format}`;
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget && !exporting) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ width: "min(560px, 100%)", maxHeight: "100%", overflowY: "auto", background: "var(--bg-surface)", border: "1px solid var(--border-color)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 20px", height: "52px", borderBottom: "1px solid var(--border-color)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Printer style={{ width: "15px", height: "15px", color: "var(--gold-primary)" }} />
            <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Print &amp; Manuscript Export</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", padding: "4px" }}>
            <X style={{ width: "15px", height: "15px" }} />
          </button>
        </div>

        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <span style={label}>Format</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {PRESETS.map((p) => (
                <label key={p.id} style={{ display: "flex", gap: "10px", alignItems: "flex-start", padding: "8px 10px", cursor: "pointer", border: `1px solid ${p.id === preset.id ? "var(--gold-border)" : "var(--border-color)"}`, background: p.id === preset.id ? "var(--gold-subtle)" : "transparent" }}>
                  <input type="radio" name="preset" checked={p.id === preset.id} onChange={() => set({ preset: p.id })} style={{ marginTop: "3px", accentColor: "var(--gold-primary)" }} />
                  <span>
                    <span style={{ display: "block", fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 600, color: "var(--text-primary)" }}>{p.label}</span>
                    <span style={{ fontFamily: "var(--font-inter)", fontSize: "11.5px", color: "var(--text-dim)" }}>{p.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 140px" }}>
              <span style={label}>File type</span>
              <div style={{ display: "flex", border: "1px solid var(--border-color)" }}>
                {(["pdf", "docx"] as const).map((f) => (
                  <button key={f} onClick={() => set({ format: f })} style={{ flex: 1, padding: "7px", border: "none", cursor: "pointer", fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 600, background: opts.format === f ? "var(--gold-subtle)" : "transparent", color: opts.format === f ? "var(--gold-primary)" : "var(--text-muted)" }}>
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ flex: "1 1 140px" }}>
              <span style={label}>Font</span>
              <select value={font} onChange={(e) => set({ font: e.target.value as FontId })} style={input}>
                {preset.fonts.map((f) => <option key={f} value={f}>{FONT_LABELS[f]}</option>)}
              </select>
            </div>
          </div>

          <div>
            <span style={label}>Author name</span>
            <input value={opts.author} onChange={(e) => set({ author: e.target.value })} placeholder="As it should appear in the book" style={input} />
          </div>
          {preset.kind === "manuscript" && (
            <div>
              <span style={label}>Contact details</span>
              <textarea value={opts.contact} onChange={(e) => set({ contact: e.target.value })} rows={3} placeholder={"Street address\nCity, State ZIP\nemail@example.com"} style={{ ...input, resize: "vertical" }} />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { key: "frontMatter" as const, text: preset.kind === "kdp" ? "Include title page and copyright page" : "Include cover page with contact info and word count" },
              { key: "sceneTitles" as const, text: "Print scene (subchapter) titles; otherwise separate scenes with a scene break" },
            ].map(({ key, text }) => (
              <label key={key} style={{ display: "flex", gap: "8px", alignItems: "flex-start", fontFamily: "var(--font-inter)", fontSize: "12.5px", color: "var(--text-secondary)", cursor: "pointer" }}>
                <input type="checkbox" checked={opts[key]} onChange={(e) => set({ [key]: e.target.checked })} style={{ marginTop: "2px", accentColor: "var(--gold-primary)" }} />
                {text}
              </label>
            ))}
          </div>

          <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: "11.5px", lineHeight: 1.55, color: "var(--text-dim)" }}>
            {preset.kind === "kdp"
              ? opts.format === "pdf"
                ? "Print-ready interior for KDP paperback: exact trim size, no bleed, fonts embedded, inside margin sized to your page count. Upload it as your manuscript file in KDP."
                : "Word file at KDP trim size and margins. KDP converts it on upload; for the most predictable result use PDF."
              : "Letter size, 1\" margins, 12pt, double-spaced, with a running header. The format agents and editors expect."}
          </p>
          {error && <p style={{ margin: 0, fontFamily: "var(--font-inter)", fontSize: "12px", color: "#ef4444" }}>{error}</p>}
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", padding: "12px 20px", borderTop: "1px solid var(--border-color)" }}>
          <button onClick={onClose} disabled={exporting} style={{ padding: "8px 14px", fontSize: "13px", fontFamily: "var(--font-inter)", background: "none", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer" }}>Cancel</button>
          <button onClick={() => void runExport()} disabled={exporting} className="btn-gold" style={{ padding: "8px 16px", fontSize: "13px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            {exporting && <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} />}
            Export {opts.format.toUpperCase()}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
