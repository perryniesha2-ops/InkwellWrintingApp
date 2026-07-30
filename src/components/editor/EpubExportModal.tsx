"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Loader2, BookOpen, FileText } from "lucide-react";
import {
  DEFAULT_SETTINGS,
  FONTS,
  SCENE_BREAK_CHARS,
  type EpubSettings,
} from "@/lib/epub/typography";

interface EpubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentId: string;
  title: string;
}

const CHAPTER_STYLES: {
  id: EpubSettings["chapterStyle"];
  label: string;
  preview: string;
  desc: string;
}[] = [
  { id: "classic",      label: "Classic",      preview: "Chapter One\n────────\nTITLE",          desc: "Traditional with rule" },
  { id: "minimal",      label: "Minimal",      preview: "ONE\ntitle",                            desc: "Clean, understated" },
  { id: "ornate",       label: "Ornate",       preview: "❧\nChapter One\nTitle\n❧",              desc: "Decorative ornaments" },
  { id: "modern",       label: "Modern",       preview: "TITLE\n── ──",                          desc: "Bold and graphic" },
  { id: "dark",         label: "Dark",         preview: "— one —\nTITLE",                        desc: "Moody, atmospheric" },
  { id: "contemporary", label: "Contemporary", preview: "CHAPTER ONE\nTitle\n──────────",        desc: "Left-aligned editorial" },
  { id: "elegant",      label: "Elegant",      preview: "──────\nOne\nTitle\n──────",            desc: "Double rule, italic" },
  { id: "bold",         label: "Bold",         preview: "▬▬▬▬▬▬\nONE\nTITLE",                  desc: "Heavy rule, uppercase" },
  { id: "vintage",      label: "Vintage",      preview: "— ❧ —\nChapter the One\n— ❧ —",        desc: "Ornate, old-world" },
  { id: "romantic",     label: "Romantic",     preview: "Title\none\n✦ ─── ✦",                   desc: "Soft, flowing" },
  { id: "thriller",     label: "Thriller",     preview: "▬▬▬▬▬▬▬▬\none\nTITLE",                desc: "Sharp, left-aligned" },
  { id: "literary",     label: "Literary",     preview: "ONE\nTitle\n──────────",                desc: "Understated, italic" },
];



function SectionLabel({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: "10px",
      fontFamily: "var(--font-inter)",
      fontWeight: 600,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "var(--text-dim)",
      marginBottom: "10px",
      marginTop: 0,
    }}>
      {text}
    </p>
  );
}

export default function EpubExportModal({
  isOpen, onClose, documentId, title,
}: EpubExportModalProps) {
  const [settings, setSettings] = useState<EpubSettings>(DEFAULT_SETTINGS);
  const [exporting, setExporting] = useState(false);

  const update = (updates: Partial<EpubSettings>) =>
    setSettings((prev) => ({ ...prev, ...updates }));

  const handleExportEpub = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/export/epub`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(title || "manuscript").replace(/[^a-z0-9]/gi, "-").toLowerCase()}.epub`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onClose();
    } catch (err) {
      console.error("EPUB export error:", err);
      alert("EPUB export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handlePrintPdf = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/export/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Export failed");
      const html = await response.text();
      const win = window.open("", "_blank");
      if (!win) { alert("Allow pop-ups to export PDF."); return; }
      win.document.write(html);
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); }, 1500);
    } catch (err) {
      console.error("PDF export error:", err);
      alert("PDF export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  if (typeof window === "undefined") return null;

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center",
            justifyContent: "center", padding: "2rem",
          }}>

          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{
              width: "100%", maxWidth: "740px",
              height: "90vh",
              display: "flex", flexDirection: "column",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              zIndex: 10000, overflow: "hidden",
            }}>

            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 20px",
              borderBottom: "1px solid var(--border-color)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <BookOpen style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
                <div>
                  <p style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", margin: 0 }}>
                    Export
                  </p>
                  <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", margin: 0 }}>
                    For proofing & ARC copies · Use Vellum or Atticus for final publication
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", padding: "4px", display: "flex" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            {/* Scrollable content */}
            <div style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "28px",
              minHeight: 0,
            }}>

              {/* Chapter Style */}
              <div>
                <SectionLabel text="Chapter Style" />
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px",
                }}>
                  {CHAPTER_STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => update({ chapterStyle: s.id })}
                      style={{
                        padding: "12px",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background: settings.chapterStyle === s.id ? "var(--gold-subtle)" : "var(--bg-elevated)",
                        border: `1px solid ${settings.chapterStyle === s.id ? "var(--gold-primary)" : "var(--border-color)"}`,
                        textAlign: "left",
                        position: "relative",
                      }}
                      onMouseEnter={(e) => {
                        if (settings.chapterStyle !== s.id)
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)";
                      }}
                      onMouseLeave={(e) => {
                        if (settings.chapterStyle !== s.id)
                          (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                      }}>
                      {settings.chapterStyle === s.id && (
                        <div style={{
                          position: "absolute", top: "6px", right: "6px",
                          width: "16px", height: "16px",
                          background: "var(--gold-primary)", borderRadius: "50%",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <span style={{ color: "var(--bg-primary)", fontSize: "10px" }}>✓</span>
                        </div>
                      )}
                      <pre style={{
                        fontFamily: "var(--font-cormorant), Georgia, serif",
                        fontSize: "10px", lineHeight: 1.5,
                        color: settings.chapterStyle === s.id ? "var(--text-primary)" : "var(--text-muted)",
                        marginBottom: "8px", whiteSpace: "pre",
                        overflow: "hidden",
                      }}>
                        {s.preview}
                      </pre>
                      <p style={{
                        fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600,
                        color: settings.chapterStyle === s.id ? "var(--gold-primary)" : "var(--text-primary)",
                        margin: "0 0 2px",
                      }}>
                        {s.label}
                      </p>
                      <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", margin: 0 }}>
                        {s.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Body Font */}
              <div>
                <SectionLabel text="Body Font" />
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  {(Object.entries(FONTS) as [EpubSettings["bodyFont"], typeof FONTS[keyof typeof FONTS]][]).map(([key, font]) => (
                    <button
                      key={key}
                      onClick={() => update({ bodyFont: key })}
                      style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 12px", cursor: "pointer",
                        border: "none", transition: "all 0.15s",
                        background: settings.bodyFont === key ? "var(--gold-subtle)" : "transparent",
                        borderLeft: settings.bodyFont === key
                          ? "2px solid var(--gold-primary)"
                          : "2px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (settings.bodyFont !== key)
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (settings.bodyFont !== key)
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}>
                      <span style={{
                        fontSize: "12px", fontFamily: "var(--font-inter)",
                        color: settings.bodyFont === key ? "var(--gold-primary)" : "var(--text-muted)",
                        fontWeight: 500,
                      }}>
                        {font.label}
                      </span>
                      <span style={{ fontFamily: font.stack, fontSize: "15px", color: "var(--text-secondary)" }}>
                        The quick brown fox
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Scene Break */}
              <div>
                <SectionLabel text="Scene Break" />
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {(Object.entries(SCENE_BREAK_CHARS) as [EpubSettings["sceneBreak"], string][]).map(([key, char]) => (
                    <button
                      key={key}
                      onClick={() => update({ sceneBreak: key })}
                      style={{
                        padding: "10px 20px",
                        fontSize: "18px",
                        fontFamily: "Georgia, 'Times New Roman', serif",
                        border: "1px solid",
                        borderColor: settings.sceneBreak === key ? "var(--gold-primary)" : "var(--border-color)",
                        background: settings.sceneBreak === key ? "var(--gold-subtle)" : "var(--bg-elevated)",
                        color: settings.sceneBreak === key ? "var(--gold-primary)" : "var(--text-muted)",
                        cursor: "pointer", transition: "all 0.15s",
                        minWidth: "60px", textAlign: "center",
                      }}>
                      {char}
                    </button>
                  ))}
                </div>
              </div>

              

              {/* Line Spacing + Drop Cap */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                <div>
                  <SectionLabel text="Line Spacing" />
                  <div style={{ display: "flex", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", padding: "3px", gap: "2px" }}>
                    {(["tight", "normal", "loose"] as EpubSettings["lineHeight"][]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => update({ lineHeight: opt })}
                        style={{
                          flex: 1, padding: "6px 8px",
                          fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600,
                          border: "none", cursor: "pointer", transition: "all 0.15s",
                          background: settings.lineHeight === opt ? "var(--gold-primary)" : "transparent",
                          color: settings.lineHeight === opt ? "var(--bg-primary)" : "var(--text-muted)",
                          textTransform: "capitalize",
                        }}>
                        {opt.charAt(0).toUpperCase() + opt.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <SectionLabel text="Drop Cap" />
                  <div style={{ display: "flex", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", padding: "3px", gap: "2px" }}>
                    {[{ label: "On", value: true }, { label: "Off", value: false }].map((opt) => (
                      <button
                        key={opt.label}
                        onClick={() => update({ dropCap: opt.value })}
                        style={{
                          flex: 1, padding: "6px 8px",
                          fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600,
                          border: "none", cursor: "pointer", transition: "all 0.15s",
                          background: settings.dropCap === opt.value ? "var(--gold-primary)" : "transparent",
                          color: settings.dropCap === opt.value ? "var(--bg-primary)" : "var(--text-muted)",
                        }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Chapter Heading Alignment */}
<div>
  <SectionLabel text="Chapter Heading Alignment" />
  <div style={{
    display: "flex", background: "var(--bg-elevated)",
    border: "1px solid var(--border-color)", padding: "3px", gap: "2px",
  }}>
    {[
      { value: "center" as const, label: "Center", icon: "⬛" },
      { value: "left" as const,   label: "Left",   icon: "▬" },
    ].map((opt) => (
      <button
        key={opt.value}
        onClick={() => update({ chapterAlign: opt.value })}
        style={{
          flex: 1, padding: "6px 8px",
          fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600,
          border: "none", cursor: "pointer", transition: "all 0.15s",
          background: settings.chapterAlign === opt.value ? "var(--gold-primary)" : "transparent",
          color: settings.chapterAlign === opt.value ? "var(--bg-primary)" : "var(--text-muted)",
        }}>
        {opt.label}
      </button>
    ))}
  </div>
</div>

              {/* Preview */}
              <div>
                <SectionLabel text="Preview" />
                <div style={{
                  padding: "24px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  fontFamily: FONTS[settings.bodyFont].stack,
                  fontSize: "13px",
                  lineHeight: settings.lineHeight === "tight" ? "1.6"
                    : settings.lineHeight === "loose" ? "2.0" : "1.8",
                  color: "var(--text-primary)",
                }}>
                  {/* Chapter heading preview */}
                  {/* Chapter heading preview */}
<div style={{
  textAlign: settings.chapterAlign ?? "center",
  marginBottom: "1.5em",
}}>
  <p style={{
    fontSize: "1.3em", fontWeight: "bold",
    marginBottom: "0.75em", textIndent: 0,
    textAlign: settings.chapterAlign ?? "center",
  }}>
    Chapter 1 - Tamira
  </p>
  <p style={{
    textAlign: settings.chapterAlign ?? "center",
    color: "var(--text-dim)", letterSpacing: "0.3em",
    fontFamily: "Georgia, serif", textIndent: 0,
  }}>
    {SCENE_BREAK_CHARS[settings.sceneBreak]}
  </p>
</div>

                  {/* Body text */}
                  <p style={{ textIndent: 0, margin: 0 }}>
                    {settings.dropCap && (
                      <span style={{
                        fontSize: "3.2em", fontWeight: "bold",
                        float: "left", lineHeight: 0.75,
                        marginRight: "0.06em", marginTop: "0.05em",
                      }}>
                        H
                      </span>
                    )}
                    er shift started at six, same as always. She clipped her badge to her scrubs and took a breath before pushing through the doors.
                  </p>
                  <p style={{ textIndent: "1.5em", margin: 0 }}>
                    The ER was already busy. It was always busy. That was the part they never told you in nursing school — that you would never quite catch up.
                  </p>

                  {/* Scene break */}
                  <p style={{
                    textAlign: "center", margin: "1.25em 0",
                    letterSpacing: "0.3em", color: "var(--text-dim)",
                    fontFamily: "Georgia, serif",
                    textIndent: 0,
                  }}>
                    {SCENE_BREAK_CHARS[settings.sceneBreak]}
                  </p>

                  <p style={{ textIndent: 0, margin: 0 }}>
                    Room four. The next patient was waiting.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: "16px 20px",
              borderTop: "1px solid var(--border-color)",
              display: "flex", alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
              background: "var(--bg-surface)",
            }}>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", fontStyle: "italic", margin: 0 }}>
                For proofing and ARC copies
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={onClose}
                  style={{ padding: "8px 16px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px", fontFamily: "var(--font-inter)", transition: "all 0.15s" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                  Cancel
                </button>
                <button
                  onClick={() => void handlePrintPdf()}
                  disabled={exporting}
                  style={{
                    display: "flex", alignItems: "center", gap: "6px",
                    padding: "8px 16px",
                    background: "var(--bg-elevated)",
                    color: "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                    cursor: exporting ? "not-allowed" : "pointer",
                    fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 500,
                    opacity: exporting ? 0.7 : 1, transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-secondary)"; }}>
                  <FileText style={{ width: "14px", height: "14px" }} />
                  Print PDF
                </button>
                <button
                  onClick={() => void handleExportEpub()}
                  disabled={exporting}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "8px 20px",
                    background: "var(--gold-primary)", color: "var(--bg-primary)",
                    border: "none",
                    cursor: exporting ? "not-allowed" : "pointer",
                    fontSize: "13px", fontFamily: "var(--font-inter)", fontWeight: 600,
                    opacity: exporting ? 0.7 : 1,
                  }}>
                  {exporting
                    ? <><Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" /> Generating…</>
                    : <><Download style={{ width: "14px", height: "14px" }} /> Export EPUB</>}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modal, document.body);
}