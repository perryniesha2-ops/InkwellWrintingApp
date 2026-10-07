"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { ArrowRight } from "lucide-react";
import { groupLabel, type StoryElement } from "@/lib/storyElements";
import type { SmartSuggestionState } from "@/components/editor/smartTextExtension";

const HOVER_DELAY_MS = 350;
const HIDE_DELAY_MS = 200;
const CARD_WIDTH = 300;

interface SmartTextLayerProps {
  suggestion: SmartSuggestionState | null;
  elements: StoryElement[];
  containerRef: RefObject<HTMLDivElement | null>;
  onOpenElement?: (id: string) => void;
}

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function Avatar({ el, size }: { el: StoryElement; size: number }) {
  return el.photos[0] ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={el.photos[0]} alt="" style={{ width: size, height: size, objectFit: "cover", objectPosition: "center top", flexShrink: 0 }} />
  ) : (
    <div style={{
      width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--gold-subtle)", color: "var(--gold-primary)",
      fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: size * 0.45,
    }}>
      {(el.name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

export default function SmartTextLayer({ suggestion, elements, containerRef, onOpenElement }: SmartTextLayerProps) {
  const [hover, setHover] = useState<{ id: string; left: number; top: number } | null>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onOpenRef = useRef(onOpenElement);
  useEffect(() => { onOpenRef.current = onOpenElement; }, [onOpenElement]);

  // Hover previews and ⌘/Ctrl-click on linked names.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const linkFrom = (e: Event) => (e.target as HTMLElement).closest?.<HTMLElement>(".smart-link");

    const onOver = (e: MouseEvent) => {
      const link = linkFrom(e);
      if (!link) return;
      clearTimeout(hideTimer.current);
      clearTimeout(showTimer.current);
      showTimer.current = setTimeout(() => {
        const r = link.getBoundingClientRect();
        setHover({
          id: link.dataset.elementId!,
          left: Math.min(r.left, window.innerWidth - CARD_WIDTH - 16),
          top: r.bottom + 6,
        });
      }, HOVER_DELAY_MS);
    };
    const onOut = (e: MouseEvent) => {
      if (!linkFrom(e)) return;
      clearTimeout(showTimer.current);
      hideTimer.current = setTimeout(() => setHover(null), HIDE_DELAY_MS);
    };
    const onClick = (e: MouseEvent) => {
      const link = linkFrom(e);
      if (!link || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setHover(null);
      onOpenRef.current?.(link.dataset.elementId!);
    };

    container.addEventListener("mouseover", onOver);
    container.addEventListener("mouseout", onOut);
    container.addEventListener("click", onClick);
    return () => {
      container.removeEventListener("mouseover", onOver);
      container.removeEventListener("mouseout", onOut);
      container.removeEventListener("click", onClick);
      clearTimeout(showTimer.current);
      clearTimeout(hideTimer.current);
    };
  }, [containerRef]);

  const byId = new Map(elements.map((e) => [e.id, e]));
  const hovered = hover ? byId.get(hover.id) : undefined;
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      {/* Autocomplete */}
      {suggestion && (
        <div
          role="listbox"
          style={{
            position: "fixed", left: suggestion.rect.left, top: suggestion.rect.bottom + 6, zIndex: 9999,
            minWidth: "220px", maxWidth: "320px", background: "var(--bg-elevated)",
            border: "1px solid var(--border-color)", boxShadow: "0 8px 24px rgba(0,0,0,0.35)", padding: "4px",
          }}>
          {suggestion.items.map((item, i) => {
            const el = byId.get(item.term.elementId);
            if (!el) return null;
            const selected = i === suggestion.index;
            return (
              <div
                key={`${item.term.text}-${el.id}`}
                role="option"
                aria-selected={selected}
                onMouseDown={(e) => { e.preventDefault(); suggestion.accept(i); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px", padding: "5px 8px", cursor: "pointer",
                  background: selected ? "var(--gold-subtle)" : "transparent",
                }}>
                <Avatar el={el} size={22} />
                <span style={{ flex: 1, minWidth: 0, fontSize: "13px", fontFamily: "var(--font-inter)", color: selected ? "var(--gold-primary)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.term.text}
                </span>
                <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {groupLabel(el.category).replace(/s$/, "")}
                </span>
              </div>
            );
          })}
          <div style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", padding: "4px 8px 2px", borderTop: "1px solid var(--border-color)", marginTop: "4px" }}>
            ↑↓ choose · Tab/Enter insert · Esc dismiss
          </div>
        </div>
      )}

      {/* Hover preview */}
      {hover && hovered && (
        <div
          onMouseEnter={() => clearTimeout(hideTimer.current)}
          onMouseLeave={() => { hideTimer.current = setTimeout(() => setHover(null), HIDE_DELAY_MS); }}
          style={{
            position: "fixed", left: Math.max(16, hover.left), top: hover.top, width: CARD_WIDTH, zIndex: 9998,
            background: "var(--bg-surface)", border: "1px solid var(--border-color)",
            borderTop: "2px solid var(--gold-primary)", boxShadow: "0 12px 32px rgba(0,0,0,0.4)",
          }}>
          <div style={{ display: "flex", gap: "12px", padding: "12px" }}>
            <Avatar el={hovered} size={56} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gold-primary)" }}>
                {groupLabel(hovered.category).replace(/s$/, "")}
              </div>
              <div style={{ fontSize: "15px", fontFamily: "var(--font-dm-sans)", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                {hovered.name}
              </div>
              {hovered.subtitle && (
                <div style={{ fontSize: "11.5px", fontFamily: "var(--font-inter)", color: "var(--text-muted)" }}>{hovered.subtitle}</div>
              )}
            </div>
          </div>
          {[["Description", hovered.description], ["Notes", hovered.notes]].map(([title, text]) => text && (
            <div key={title} style={{ padding: "0 12px 10px" }}>
              <div style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "2px" }}>{title}</div>
              <p style={{ margin: 0, fontSize: "12px", fontFamily: "var(--font-inter)", lineHeight: 1.5, color: "var(--text-secondary)", display: "-webkit-box", WebkitLineClamp: 4, WebkitBoxOrient: "vertical", overflow: "hidden", whiteSpace: "pre-wrap" }}>
                {text}
              </p>
            </div>
          ))}
          {!hovered.description && !hovered.notes && (
            <p style={{ margin: 0, padding: "0 12px 10px", fontSize: "12px", fontFamily: "var(--font-inter)", fontStyle: "italic", color: "var(--text-dim)" }}>
              No description yet.
            </p>
          )}
          {onOpenElement && (
            <button
              onClick={() => { setHover(null); onOpenElement(hovered.id); }}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                padding: "8px 12px", background: "var(--bg-elevated)", border: "none",
                borderTop: "1px solid var(--border-color)", cursor: "pointer",
                fontSize: "11.5px", fontFamily: "var(--font-inter)", color: "var(--gold-primary)",
              }}>
              <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                Open all details <ArrowRight style={{ width: "12px", height: "12px" }} />
              </span>
              <span style={{ color: "var(--text-dim)" }}>{isMac ? "⌘" : "Ctrl"}-click</span>
            </button>
          )}
        </div>
      )}
    </>,
    document.body,
  );
}
