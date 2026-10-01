"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { LayoutList, Loader2, X } from "lucide-react";
import { OUTLINE_TEMPLATES, countBeats, type OutlineTemplate } from "@/lib/outlineTemplates";

interface TemplateGalleryProps {
  onClose: () => void;
  onApply: (template: OutlineTemplate) => Promise<boolean>;
  /** True when the book has only an empty first chapter, which will be replaced. */
  bookIsEmpty: boolean;
}

export default function TemplateGallery({ onClose, onApply, bookIsEmpty }: TemplateGalleryProps) {
  const [selected, setSelected] = useState<OutlineTemplate>(OUTLINE_TEMPLATES[0]);
  const [applying, setApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { chapters, scenes } = countBeats(selected);

  const apply = async () => {
    setApplying(true);
    setError(null);
    const ok = await onApply(selected);
    setApplying(false);
    if (ok) onClose();
    else setError("Couldn't add the template. Please try again.");
  };

  return createPortal(
    <div
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          width: "min(960px, 100%)", height: "min(640px, 100%)", display: "flex", flexDirection: "column",
          background: "var(--bg-surface)", border: "1px solid var(--border-color)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
        }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px 0 20px", height: "52px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <LayoutList style={{ width: "15px", height: "15px", color: "var(--gold-primary)" }} />
            <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)" }}>Outline Templates</span>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", display: "flex", padding: "4px" }}>
            <X style={{ width: "15px", height: "15px" }} />
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, display: "flex", flexWrap: "wrap" }}>
          {/* Template list */}
          <div style={{ flex: "1 1 260px", maxWidth: "100%", borderRight: "1px solid var(--border-color)", overflowY: "auto", padding: "8px", maxHeight: "100%" }}>
            {OUTLINE_TEMPLATES.map((t) => {
              const active = t.id === selected.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "10px 12px", marginBottom: "2px",
                    background: active ? "var(--gold-subtle)" : "transparent", cursor: "pointer",
                    border: "none", borderLeft: active ? "2px solid var(--gold-primary)" : "2px solid transparent",
                  }}>
                  <div style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 600, fontSize: "13px", color: active ? "var(--gold-primary)" : "var(--text-primary)" }}>{t.name}</div>
                  <div style={{ fontFamily: "var(--font-inter)", fontSize: "11.5px", color: "var(--text-dim)", lineHeight: 1.45, marginTop: "2px" }}>{t.summary}</div>
                </button>
              );
            })}
          </div>

          {/* Preview */}
          <div style={{ flex: "2 1 400px", minWidth: 0, display: "flex", flexDirection: "column", maxHeight: "100%" }}>
            <div style={{ padding: "20px 24px 12px", flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "20px", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>{selected.name}</h2>
              <p style={{ margin: "6px 0 0", fontFamily: "var(--font-inter)", fontSize: "12.5px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text-secondary)" }}>Best for:</strong> {selected.bestFor}
              </p>
            </div>
            <ol style={{ flex: 1, overflowY: "auto", margin: 0, padding: "0 24px 16px", listStyle: "none" }}>
              {selected.beats.map((beat, i) => (
                <li key={beat.title} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--border-color)" : "none" }}>
                  <div style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)" }}>{beat.title}</div>
                  <p style={{ margin: "3px 0 0", fontFamily: "var(--font-inter)", fontSize: "12px", lineHeight: 1.55, color: "var(--text-muted)" }}>{beat.guidance}</p>
                  {beat.children && (
                    <ul style={{ margin: "8px 0 0", padding: "0 0 0 14px", listStyle: "none", borderLeft: "1px solid var(--gold-border)" }}>
                      {beat.children.map((c) => (
                        <li key={c.title} style={{ padding: "4px 0" }}>
                          <span style={{ fontFamily: "var(--font-inter)", fontWeight: 600, fontSize: "12px", color: "var(--text-secondary)" }}>{c.title}</span>
                          <span style={{ fontFamily: "var(--font-inter)", fontSize: "12px", color: "var(--text-dim)" }}> · {c.guidance}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ol>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", justifyContent: "space-between", flexWrap: "wrap", padding: "12px 24px", borderTop: "1px solid var(--border-color)", flexShrink: 0 }}>
              <span style={{ fontFamily: "var(--font-inter)", fontSize: "11.5px", color: error ? "#ef4444" : "var(--text-dim)", flex: "1 1 240px" }}>
                {error ?? (
                  <>
                    Adds {chapters} chapters{scenes ? ` and ${scenes} scenes` : ""}
                    {bookIsEmpty ? " to your book." : " after your existing chapters. Nothing you've written is changed."}
                    {" "}Each one shows its guidance while you write.
                  </>
                )}
              </span>
              <button
                onClick={() => void apply()}
                disabled={applying}
                className="btn-gold"
                style={{ padding: "8px 16px", fontSize: "13px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                {applying && <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} />}
                Use this template
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
