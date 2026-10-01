"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { NEW_ELEMENT_TYPES, type NewElementType } from "@/lib/storyElements";

/** A trigger button that opens a small menu of story element types. */
export default function NewElementMenu({
  onPick,
  children,
  title = "New story element",
  buttonStyle,
}: {
  onPick: (type: NewElementType) => void;
  children: ReactNode;
  title?: string;
  buttonStyle?: React.CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button title={title} onClick={() => setOpen((o) => !o)} style={buttonStyle}>
        {children}
      </button>
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 60,
          background: "var(--bg-elevated)", border: "1px solid var(--border-color)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: "140px", padding: "4px",
        }}>
          {NEW_ELEMENT_TYPES.map((type) => (
            <button
              key={type.label}
              onClick={() => { setOpen(false); onPick(type); }}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "6px 10px",
                fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-primary)",
                background: "transparent", border: "none", cursor: "pointer",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--gold-subtle)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              {type.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
