"use client;";

import { useState, useRef, useEffect } from "react";
import { Settings, X } from "lucide-react";
import { FONT_OPTIONS, SIZE_OPTIONS } from "@/hooks/useEditorPrefs";
import type { FontFamily, FontSize, EditorPrefs } from "@/hooks/useEditorPrefs";
import { THEMES } from "@/lib/theme";
import { useTheme } from "@/hooks/useTheme";
import type { Theme } from "@/lib/theme";
import { createPortal } from "react-dom";

interface EditorSettingsProps {
  prefs: EditorPrefs;
  onUpdate: (updates: Partial<EditorPrefs>) => void;
}

export default function EditorSettings({
  prefs,
  onUpdate,
}: EditorSettingsProps) {
  const { theme, changeTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!triggerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPanelPos({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
    setOpen((o) => !o);
  };

  const currentFont = FONT_OPTIONS.find((f) => f.value === prefs.fontFamily);
  const currentSize = SIZE_OPTIONS.find((s) => s.value === prefs.fontSize);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleOpen}
        className="flex items-center justify-center w-7 h-7 transition-colors shrink-0"
        title="Editor settings"
        style={{
          color: open ? "var(--text-primary)" : "var(--text-muted)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
        }}
        onMouseLeave={(e) => {
          if (!open)
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
        }}
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {open &&
        createPortal(
          <div
            style={{
              position: "fixed",
              top: panelPos.top,
              right: panelPos.right,
              zIndex: 99999,
              width: "272px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-color)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
              fontFamily: "Inter, sans-serif",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                }}
              >
                Appearance
              </span>
              <button
                onClick={() => setOpen(false)}
                style={{
                  color: "var(--text-dim)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-primary)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.color =
                    "var(--text-dim)";
                }}
              >
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>

            <div
              style={{
                padding: "14px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              {/* Theme */}
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    marginBottom: "8px",
                  }}
                >
                  Theme
                </p>
                <div
                  style={{
                    display: "flex",
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-color)",
                    padding: "3px",
                    gap: "2px",
                  }}
                >
                  {THEMES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => changeTheme(t.value as Theme)}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        fontSize: "11px",
                        fontFamily: "Inter",
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        background:
                          theme === t.value
                            ? "var(--gold-primary)"
                            : "transparent",
                        color:
                          theme === t.value
                            ? "var(--bg-primary)"
                            : "var(--text-muted)",
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div
                style={{ height: "1px", background: "var(--border-color)" }}
              />

              {/* Font family */}
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    marginBottom: "8px",
                  }}
                >
                  Font
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                  }}
                >
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.value}
                      onClick={() =>
                        onUpdate({ fontFamily: f.value as FontFamily })
                      }
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 10px",
                        cursor: "pointer",
                        border: "none",
                        transition: "all 0.15s",
                        background:
                          prefs.fontFamily === f.value
                            ? "var(--gold-subtle)"
                            : "transparent",
                        borderLeft:
                          prefs.fontFamily === f.value
                            ? "2px solid var(--gold-primary)"
                            : "2px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (prefs.fontFamily !== f.value)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (prefs.fontFamily !== f.value)
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "Inter",
                          color: "var(--text-muted)",
                        }}
                      >
                        {f.label}
                      </span>
                      <span
                        style={{
                          fontFamily: f.style,
                          fontSize: "13px",
                          color:
                            prefs.fontFamily === f.value
                              ? "var(--gold-primary)"
                              : "var(--text-secondary)",
                        }}
                      >
                        The quick brown fox
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div
                style={{ height: "1px", background: "var(--border-color)" }}
              />

              {/* Font size */}
              <div>
                <p
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                    marginBottom: "8px",
                  }}
                >
                  Text Size
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4, 1fr)",
                    gap: "2px",
                  }}
                >
                  {SIZE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() =>
                        onUpdate({ fontSize: s.value as FontSize })
                      }
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "10px 4px",
                        cursor: "pointer",
                        border: "none",
                        transition: "all 0.15s",
                        background:
                          prefs.fontSize === s.value
                            ? "var(--gold-subtle)"
                            : "var(--bg-elevated)",
                        borderBottom:
                          prefs.fontSize === s.value
                            ? "2px solid var(--gold-primary)"
                            : "2px solid transparent",
                      }}
                      onMouseEnter={(e) => {
                        if (prefs.fontSize !== s.value)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--bg-overlay)";
                      }}
                      onMouseLeave={(e) => {
                        if (prefs.fontSize !== s.value)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--bg-elevated)";
                      }}
                    >
                      <span
                        style={{
                          fontSize: s.size,
                          fontFamily: currentFont?.style ?? "serif",
                          color:
                            prefs.fontSize === s.value
                              ? "var(--gold-primary)"
                              : "var(--text-secondary)",
                          lineHeight: 1,
                        }}
                      >
                        A
                      </span>
                      <span
                        style={{
                          fontSize: "9px",
                          fontFamily: "Inter",
                          color: "var(--text-dim)",
                          marginTop: "4px",
                        }}
                      >
                        {s.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div
                style={{ height: "1px", background: "var(--border-color)" }}
              />

              {/* Preview */}
              <div
                style={{
                  padding: "10px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <p
                  style={{
                    fontSize: "10px",
                    fontFamily: "Inter",
                    color: "var(--text-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "8px",
                  }}
                >
                  Preview
                </p>
                <p
                  style={{
                    fontFamily: currentFont?.style,
                    fontSize: currentSize?.size,
                    lineHeight: currentSize?.lineHeight,
                    color: "var(--prose-color)",
                    margin: 0,
                  }}
                >
                  It was the best of times, it was the worst of times.
                </p>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
