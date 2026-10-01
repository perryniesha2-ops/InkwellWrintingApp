"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Lightbulb, X } from "lucide-react";

/** Shows an outline-template beat's guidance above the editor. */
export default function GuidanceBanner({ title, guidance, onDismiss }: {
  title: string;
  guidance: string;
  onDismiss: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const small = { background: "none", border: "none", cursor: "pointer", display: "flex", padding: "2px", color: "var(--text-dim)" } as const;

  return (
    <div style={{
      flexShrink: 0, display: "flex", alignItems: "flex-start", gap: "10px",
      padding: collapsed ? "6px 16px" : "10px 16px",
      background: "var(--gold-subtle)", borderBottom: "1px solid var(--gold-border)",
    }}>
      <Lightbulb style={{ width: "14px", height: "14px", color: "var(--gold-primary)", flexShrink: 0, marginTop: "2px" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-inter)", fontSize: "10.5px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-primary)" }}>
          Beat guide · {title}
        </div>
        {!collapsed && (
          <p style={{ margin: "3px 0 0", fontFamily: "var(--font-inter)", fontSize: "12.5px", lineHeight: 1.55, color: "var(--text-secondary)", maxWidth: "720px" }}>
            {guidance}
          </p>
        )}
      </div>
      {confirming ? (
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-inter)", fontSize: "11px", color: "var(--text-muted)", flexShrink: 0 }}>
          Remove this guide for good?
          <button onClick={onDismiss} style={{ ...small, color: "var(--gold-primary)", fontSize: "11px" }}>Remove</button>
          <button onClick={() => setConfirming(false)} style={{ ...small, fontSize: "11px" }}>Keep</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: "2px", flexShrink: 0 }}>
          <button title={collapsed ? "Show guide" : "Collapse guide"} onClick={() => setCollapsed((c) => !c)} style={small}>
            {collapsed ? <ChevronDown style={{ width: "13px", height: "13px" }} /> : <ChevronUp style={{ width: "13px", height: "13px" }} />}
          </button>
          <button title="Remove guide" onClick={() => setConfirming(true)} style={small}>
            <X style={{ width: "13px", height: "13px" }} />
          </button>
        </div>
      )}
    </div>
  );
}
