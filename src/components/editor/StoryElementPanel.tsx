"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft, BookMarked, ImagePlus, Loader2, Plus, Search, Trash2, Users, X,
} from "lucide-react";
import NewElementMenu from "@/components/editor/NewElementMenu";
import { groupElements, type StoryElement } from "@/lib/storyElements";
import type { StoryElementsApi } from "@/hooks/useStoryElements";

interface StoryElementPanelProps {
  api: StoryElementsApi;
  documentId: string;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isOpen: boolean;
  onClose: () => void;
  /** View-only (collaborators limited to certain chapters). */
  readOnly?: boolean;
}

const label: React.CSSProperties = {
  display: "block", fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600,
  letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "6px",
};

const inputBase: React.CSSProperties = {
  width: "100%", background: "var(--bg-primary)", color: "var(--text-primary)",
  border: "1px solid var(--border-color)", outline: "none", padding: "8px 10px",
  fontSize: "13px", fontFamily: "var(--font-inter)", lineHeight: 1.55,
};

const iconButton: React.CSSProperties = {
  color: "var(--text-muted)", background: "none", border: "none",
  cursor: "pointer", display: "flex", padding: "4px",
};

function TextArea({ title, value, placeholder, onChange }: {
  title: string; value: string; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={label}>{title}</label>
      <textarea
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={5}
        style={{ ...inputBase, resize: "vertical", minHeight: "96px" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = "var(--gold-border)"; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
      />
    </div>
  );
}

function Thumb({ el, size }: { el: StoryElement; size: number }) {
  return el.photos[0] ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={el.photos[0]} alt="" style={{ width: size, height: size, objectFit: "cover", flexShrink: 0, border: "1px solid var(--border-color)" }} />
  ) : (
    <div style={{
      width: size, height: size, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-elevated)", border: "1px solid var(--border-color)",
      fontSize: size * 0.4, fontFamily: "var(--font-dm-sans)", fontWeight: 700, color: "var(--gold-primary)",
    }}>
      {(el.name || "?").charAt(0).toUpperCase()}
    </div>
  );
}

function ElementDetail({ el, api, documentId, onBack, readOnly }: {
  el: StoryElement; api: StoryElementsApi; documentId: string; onBack: () => void; readOnly: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (patch: Parameters<StoryElementsApi["update"]>[1]) => { if (!readOnly) api.update(el.id, patch); };
  const mainPhoto = el.photos[Math.min(photoIndex, el.photos.length - 1)];

  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <button onClick={onBack} style={{ ...iconButton, gap: "6px", fontSize: "11px", fontFamily: "var(--font-inter)", padding: 0, alignSelf: "flex-start" }}>
        <ArrowLeft style={{ width: "12px", height: "12px" }} /> All elements
      </button>

      {/* Photos */}
      <div>
        {mainPhoto ? (
          <div style={{ position: "relative" }} className="group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mainPhoto} alt={el.name} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", display: "block", border: "1px solid var(--border-color)" }} />
            {!readOnly && <button
              title="Remove photo"
              onClick={() => {
                set({ photos: el.photos.filter((p) => p !== mainPhoto) });
                setPhotoIndex(0);
              }}
              className="opacity-0 group-hover:opacity-100"
              style={{ ...iconButton, position: "absolute", top: "6px", right: "6px", background: "rgba(0,0,0,0.6)", color: "#fff" }}>
              <X style={{ width: "12px", height: "12px" }} />
            </button>}
          </div>
        ) : readOnly ? null : (
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%", aspectRatio: "4 / 3", display: "flex", flexDirection: "column", gap: "8px",
              alignItems: "center", justifyContent: "center", background: "var(--bg-primary)",
              border: "1px dashed var(--border-color)", color: "var(--text-dim)", cursor: "pointer",
              fontSize: "12px", fontFamily: "var(--font-inter)",
            }}>
            {uploading ? <Loader2 className="animate-spin" style={{ width: "18px", height: "18px" }} /> : <ImagePlus style={{ width: "18px", height: "18px" }} />}
            Add photos
          </button>
        )}
        {el.photos.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginTop: "6px", flexWrap: "wrap" }}>
            {el.photos.map((p, i) => (
              <button key={p} onClick={() => setPhotoIndex(i)} style={{ padding: 0, border: p === mainPhoto ? "1px solid var(--gold-primary)" : "1px solid transparent", cursor: "pointer", background: "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt="" style={{ width: "40px", height: "40px", objectFit: "cover", display: "block" }} />
              </button>
            ))}
            {!readOnly && <button
              title="Add photos"
              onClick={() => fileRef.current?.click()}
              style={{ width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", border: "1px dashed var(--border-color)", background: "none", color: "var(--text-dim)", cursor: "pointer" }}>
              {uploading ? <Loader2 className="animate-spin" style={{ width: "13px", height: "13px" }} /> : <Plus style={{ width: "13px", height: "13px" }} />}
            </button>}
          </div>
        )}
        {uploadError && <p style={{ fontSize: "11px", color: "#ef4444", fontFamily: "var(--font-inter)", margin: "6px 0 0" }}>{uploadError}</p>}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={async (e) => {
            if (!e.target.files?.length) return;
            setUploading(true);
            setUploadError(await api.uploadPhotos(el.id, e.target.files));
            setUploading(false);
            e.target.value = "";
          }}
        />
      </div>

      {/* Name + subtitle */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <input
          value={el.name}
          placeholder="Name"
          onChange={(e) => set({ name: e.target.value })}
          style={{ ...inputBase, border: "none", borderBottom: "1px solid var(--border-color)", background: "transparent", padding: "4px 0", fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "18px", letterSpacing: "-0.02em" }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          {el.kind === "world" && (
            <input
              value={el.category}
              list="story-element-categories"
              placeholder="Category"
              onChange={(e) => set({ category: e.target.value.toLowerCase() })}
              style={{ ...inputBase, width: "40%", padding: "6px 8px", fontSize: "12px" }}
            />
          )}
          <input
            value={el.subtitle}
            placeholder={el.kind === "character" ? "Role (protagonist, mentor…)" : "One-line summary"}
            onChange={(e) => set({ subtitle: e.target.value })}
            style={{ ...inputBase, flex: 1, padding: "6px 8px", fontSize: "12px" }}
          />
          <datalist id="story-element-categories">
            {["location", "theme", "item", "faction", "lore"].map((c) => <option key={c} value={c} />)}
          </datalist>
        </div>
      </div>

      <TextArea title="Description" value={el.description} onChange={(v) => set({ description: v })}
        placeholder={el.kind === "character" ? "Appearance, personality, how others see them…" : "What it looks, sounds and feels like…"} />
      <TextArea title="Notes" value={el.notes} onChange={(v) => set({ notes: v })}
        placeholder="Ideas, reminders, open questions…" />
      <TextArea title="History" value={el.history} onChange={(v) => set({ history: v })}
        placeholder={el.kind === "character" ? "Backstory and formative events…" : "Origins and past events…"} />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
        <Link href={`/bible/${documentId}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", textDecoration: "none" }}>
          <BookMarked style={{ width: "12px", height: "12px" }} /> Full profile in Story Bible
        </Link>
        {readOnly ? null : confirmDelete ? (
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-muted)" }}>Delete?</span>
            <button onClick={() => { void api.remove(el.id); onBack(); }} style={{ ...iconButton, color: "#ef4444", fontSize: "11px", fontFamily: "var(--font-inter)" }}>Yes</button>
            <button onClick={() => setConfirmDelete(false)} style={{ ...iconButton, fontSize: "11px", fontFamily: "var(--font-inter)" }}>No</button>
          </div>
        ) : (
          <button title="Delete element" onClick={() => setConfirmDelete(true)} style={iconButton}>
            <Trash2 style={{ width: "13px", height: "13px" }} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function StoryElementPanel({
  api, documentId, selectedId, onSelect, isOpen, onClose, readOnly = false,
}: StoryElementPanelProps) {
  const [query, setQuery] = useState("");
  const selected = api.elements.find((e) => e.id === selectedId) ?? null;
  const q = query.trim().toLowerCase();
  const filtered = q
    ? api.elements.filter((e) => `${e.name} ${e.subtitle} ${e.category}`.toLowerCase().includes(q))
    : api.elements;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "fixed", right: 0, top: "48px", bottom: 0, width: "320px",
            display: "flex", flexDirection: "column", zIndex: 40,
            background: "var(--bg-surface)", borderLeft: "1px solid var(--border-color)",
          }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px 0 16px", height: "48px", flexShrink: 0, borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Users style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                Story Elements
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {!readOnly && <NewElementMenu
                buttonStyle={iconButton}
                onPick={async (type) => {
                  const el = await api.create(type);
                  if (el) onSelect(el.id);
                }}>
                <Plus style={{ width: "14px", height: "14px" }} />
              </NewElementMenu>}
              <button onClick={onClose} style={iconButton}>
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {selected ? (
              <ElementDetail key={selected.id} el={selected} api={api} documentId={documentId} onBack={() => onSelect(null)} readOnly={readOnly} />
            ) : (
              <div style={{ padding: "12px 0" }}>
                <div style={{ position: "relative", margin: "0 16px 12px" }}>
                  <Search style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", width: "12px", height: "12px", color: "var(--text-dim)" }} />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search characters, places, themes…"
                    style={{ ...inputBase, padding: "6px 8px 6px 26px", fontSize: "12px" }}
                  />
                </div>
                {filtered.length === 0 && (
                  <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", padding: "0 16px", lineHeight: 1.6 }}>
                    {api.elements.length === 0
                      ? "Add characters, locations and themes with the + button. Give each one photos, a description, notes and history."
                      : "No matches."}
                  </p>
                )}
                {groupElements(filtered).map(([group, items]) => (
                  <div key={group} style={{ marginBottom: "12px" }}>
                    <p style={{ ...label, padding: "0 16px" }}>{group}</p>
                    {items.map((el) => (
                      <button
                        key={el.id}
                        onClick={() => onSelect(el.id)}
                        style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", textAlign: "left", padding: "6px 16px", background: "transparent", border: "none", cursor: "pointer" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
                        <Thumb el={el} size={32} />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: "13px", fontFamily: "var(--font-dm-sans)", fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {el.name || "Untitled"}
                          </div>
                          {(el.subtitle || el.description) && (
                            <div style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {el.subtitle || el.description}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
