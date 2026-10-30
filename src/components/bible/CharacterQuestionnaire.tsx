"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, Loader2, NotebookPen, X } from "lucide-react";
import {
  DONT_KNOW_YET, QUESTIONNAIRE, QUESTIONNAIRE_SUBTITLE, QUESTIONNAIRE_TITLE,
  overallProgress, partHeading, questionnaireToMarkdown,
  type QuestionnaireAnswers, type QuestionnaireItem,
} from "@/lib/characterQuestionnaire";

export type SaveStatus = "saved" | "saving" | "error";

interface CharacterQuestionnaireProps {
  character: { name: string };
  storyTitle: string;
  value: QuestionnaireAnswers;
  onChange: (next: QuestionnaireAnswers) => void;
  status: SaveStatus;
  onClose: () => void;
}

const font = { fontFamily: "var(--font-inter)" } as const;
const iconButton: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: "6px", background: "none", border: "1px solid var(--border-color)",
  color: "var(--text-muted)", cursor: "pointer", padding: "6px 10px", fontSize: "12px", ...font,
};

function AutoTextarea({ value, onChange, ariaLabel }: {
  value: string;
  onChange: (v: string) => void;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      aria-label={ariaLabel}
      rows={3}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%", boxSizing: "border-box", resize: "none", overflow: "hidden",
        background: "var(--bg-elevated)", border: "1px solid var(--border-color)", color: "var(--text-primary)",
        padding: "8px 10px", fontSize: "13.5px", lineHeight: 1.6, outline: "none", ...font,
      }}
      onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
      onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
    />
  );
}

export default function CharacterQuestionnaire({
  character, storyTitle, value, onChange, status, onClose,
}: CharacterQuestionnaireProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const setAnswer = (id: string, text: string) => {
    onChange({
      startedAt: value.startedAt ?? new Date().toISOString(),
      answers: { ...value.answers, [id]: text },
    });
  };

  const download = () => {
    const md = questionnaireToMarkdown(value, { name: character.name, story: storyTitle });
    const url = URL.createObjectURL(new Blob([md], { type: "text/markdown" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(character.name || "character").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-questionnaire.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const overall = overallProgress(value);

  const renderItem = (item: QuestionnaireItem) => {
    const answer = value.answers[item.id] ?? "";
    return (
      <div key={item.id} style={{ marginBottom: "22px" }}>
        <div style={{ display: "flex", gap: "10px", marginBottom: "6px" }}>
          <span style={{ ...font, flexShrink: 0, minWidth: "22px", fontSize: "13px", fontWeight: 700, color: "var(--gold-primary)" }}>
            {item.label}.
          </span>
          <p style={{ ...font, margin: 0, fontSize: "13.5px", fontWeight: 600, lineHeight: 1.55, color: "var(--text-primary)" }}>
            {item.text}
          </p>
        </div>
        <AutoTextarea value={answer} ariaLabel={`Question ${item.label}`} onChange={(v) => setAnswer(item.id, v)} />
        {!answer && (
          <button
            onClick={() => setAnswer(item.id, DONT_KNOW_YET)}
            style={{ ...font, marginTop: "4px", background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: "11px", color: "var(--text-dim)" }}>
            Mark as “I don&apos;t know yet”
          </button>
        )}
      </div>
    );
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={QUESTIONNAIRE_TITLE}
      style={{ position: "fixed", inset: 0, zIndex: 9000, background: "var(--bg-primary)", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "0 16px", minHeight: "52px", borderBottom: "1px solid var(--border-color)", background: "var(--bg-surface)", flexWrap: "wrap" }}>
        <NotebookPen style={{ width: "16px", height: "16px", color: "var(--gold-primary)", flexShrink: 0 }} />
        <div style={{ flex: "1 1 200px", minWidth: 0, padding: "8px 0" }}>
          <div style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "14px", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {character.name || "Unnamed Character"} · Character Questionnaire
          </div>
          <div style={{ ...font, fontSize: "11px", color: "var(--text-dim)" }}>
            {overall.answered} of {overall.total} answered
          </div>
        </div>
        <span style={{ ...font, fontSize: "11.5px", display: "flex", alignItems: "center", gap: "5px", color: status === "error" ? "#ef4444" : "var(--text-dim)" }}>
          {status === "saving" && <Loader2 className="animate-spin" style={{ width: "11px", height: "11px" }} />}
          {status === "saving" ? "Saving…" : status === "error" ? "Couldn't save — keep this open and try again" : "Saved"}
        </span>
        <button onClick={download} style={iconButton} title="Download your answers as a Markdown file">
          <Download style={{ width: "13px", height: "13px" }} /> Download
        </button>
        <button onClick={onClose} aria-label="Close questionnaire" style={{ ...iconButton, border: "none", padding: "6px" }}>
          <X style={{ width: "16px", height: "16px" }} />
        </button>
      </div>

      <div style={{ height: "3px", background: "var(--border-color)", flexShrink: 0 }}>
        <div style={{ height: "100%", width: `${(overall.answered / overall.total) * 100}%`, background: "var(--gold-primary)", transition: "width 0.2s" }} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "28px 16px 64px" }}>
          <h2 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 800, fontSize: "1.5rem", letterSpacing: "-0.02em", color: "var(--text-primary)", margin: "0 0 4px" }}>{QUESTIONNAIRE_TITLE}</h2>
          <p style={{ ...font, fontSize: "13.5px", color: "var(--text-muted)", margin: "0 0 16px", fontStyle: "italic" }}>{QUESTIONNAIRE_SUBTITLE}</p>
          <p style={{ ...font, fontSize: "13px", lineHeight: 1.7, color: "var(--text-secondary)", margin: "0 0 28px" }}>
            <strong style={{ color: "var(--text-primary)" }}>Character:</strong> {character.name || "—"}<br />
            <strong style={{ color: "var(--text-primary)" }}>Story:</strong> {storyTitle || "—"}
          </p>

          {QUESTIONNAIRE.map((part) => (
            <section key={part.id} style={{ marginBottom: "16px" }}>
              <h3 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "16px", color: "var(--text-primary)", margin: "8px 0 16px", paddingBottom: "6px", borderBottom: "1px solid var(--border-color)" }}>
                {partHeading(part)}
              </h3>
              {part.items.map(renderItem)}
            </section>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
