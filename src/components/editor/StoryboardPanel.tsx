"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, Loader2, ImagePlus, Trash2,
  ChevronLeft, ChevronRight, Save,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

interface StoryboardCard {
  id: string;
  title: string;
  notes: string | null;
  image_url: string | null;
  order_index: number;
}

interface StoryboardPanelProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
}

function CardEditor({
  card,
  documentId,
  onUpdate,
  onDelete,
}: {
  card: StoryboardCard;
  documentId: string;
  onUpdate: (card: StoryboardCard) => void;
  onDelete: (id: string) => void;
}) {
  const { user } = useUser();
  const [title, setTitle] = useState(card.title);
  const [notes, setNotes] = useState(card.notes ?? "");
  const [imageUrl, setImageUrl] = useState(card.image_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Defer state updates to avoid synchronous setState inside effect
    const raf = requestAnimationFrame(() => {
      setTitle(card.title);
      setNotes(card.notes ?? "");
      setImageUrl(card.image_url ?? "");
    });
    return () => cancelAnimationFrame(raf);
  }, [card.id]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/storyboard/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, notes, imageUrl }),
      });
      const updated = await res.json() as StoryboardCard;
      onUpdate({ ...updated, image_url: imageUrl });
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 8 * 1024 * 1024) { alert("Max 8MB"); return; }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${documentId}/${card.id}.${ext}`;

      const { data, error } = await supabase.storage
        .from("storyboard-images")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("storyboard-images")
        .getPublicUrl(data.path);

      setImageUrl(publicUrl);

      await fetch(`/api/documents/${documentId}/storyboard/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: publicUrl }),
      });

      onUpdate({ ...card, title, notes, image_url: publicUrl });
    } catch (err) {
      console.error("Upload error:", err);
      alert("Upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this scene card?")) return;
    setDeleting(true);
    try {
      await fetch(`/api/documents/${documentId}/storyboard/${card.id}`, {
        method: "DELETE",
      });
      onDelete(card.id);
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveImage = async () => {
    setImageUrl("");
    await fetch(`/api/documents/${documentId}/storyboard/${card.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: null }),
    });
    onUpdate({ ...card, image_url: null });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", }}>

      {/* Image area */}
      <div style={{ position: "relative", flexShrink: 0 }}>
        {imageUrl ? (
          <div style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              style={{ width: "100%", height: "160px", objectFit: "cover", display: "block", border: "1px solid var(--border-color)" }}
            />
            <div style={{ position: "absolute", top: "8px", right: "8px", display: "flex", gap: "4px" }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{ padding: "4px 8px", background: "rgba(0,0,0,0.7)", border: "none", color: "#fff", cursor: "pointer", fontSize: "10px", fontFamily: "var(--font-inter)" }}>
                Change
              </button>
              <button
                onClick={() => void handleRemoveImage()}
                style={{ padding: "4px", background: "rgba(239,68,68,0.8)", border: "none", color: "#fff", cursor: "pointer", display: "flex" }}>
                <X style={{ width: "12px", height: "12px" }} />
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            style={{
              height: "120px", border: "1px dashed var(--border-color)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "8px",
              background: "var(--bg-elevated)", cursor: "pointer",
              transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; }}>
            {uploading
              ? <Loader2 style={{ width: "20px", height: "20px", color: "var(--gold-primary)" }} className="animate-spin" />
              : <>
                  <ImagePlus style={{ width: "20px", height: "20px", color: "var(--text-dim)" }} />
                  <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                    Add scene image
                  </span>
                </>}
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          style={{ display: "none" }}
          onChange={(e) => void handleImageUpload(e)}
        />
      </div>

      {/* Title */}
      <div>
        <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "4px" }}>
          Scene Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Scene or chapter name..."
          style={{ width: "100%", padding: "8px 10px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", color: "var(--text-primary)", fontSize: "13px", fontFamily: "var(--font-inter)", outline: "none", boxSizing: "border-box" }}
          onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
          onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
        />
      </div>

      {/* Notes */}
      <div >
        <label style={{ display: "block", fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "4px" }}>
          Notes
        </label>
       <textarea
  value={notes}
  onChange={(e) => setNotes(e.target.value)}
  placeholder="What happens in this scene? Key moments, mood, goals..."
  style={{
    width: "100%",
    height: "100px",       // ← fixed height, not flex
    padding: "8px 10px",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    fontSize: "13px",
    fontFamily: "var(--font-inter)",
    outline: "none",
    resize: "vertical",    // ← let writer resize if needed
    lineHeight: 1.6,
    boxSizing: "border-box" as const,
  }}
  onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
  onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
/>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          style={{ flex: 1, padding: "8px", background: "var(--gold-primary)", color: "var(--bg-primary)", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", opacity: saving ? 0.7 : 1 }}>
          {saving
            ? <><Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" /> Saving…</>
            : <><Save style={{ width: "12px", height: "12px" }} /> Save</>}
        </button>
        <button
          onClick={() => void handleDelete()}
          disabled={deleting}
          style={{ padding: "8px 12px", background: "transparent", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}>
          {deleting
            ? <Loader2 style={{ width: "13px", height: "13px" }} className="animate-spin" />
            : <Trash2 style={{ width: "13px", height: "13px" }} />}
        </button>
      </div>
    </div>
  );
}

export default function StoryboardPanel({
  documentId, isOpen, onClose,
}: StoryboardPanelProps) {
  const [cards, setCards] = useState<StoryboardCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoading(true);
      try {
        const res = await fetch(`/api/documents/${documentId}/storyboard`);
        const data = await res.json() as StoryboardCard[];
        if (!cancelled) {
          setCards(data);
          setActiveIndex(0);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [isOpen, documentId]);

  const addCard = async () => {
    setAdding(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/storyboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Scene ${cards.length + 1}`,
          orderIndex: cards.length,
        }),
      });
      const card = await res.json() as StoryboardCard;
      setCards((prev) => [...prev, card]);
      setActiveIndex(cards.length);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = (updated: StoryboardCard) => {
    setCards((prev) => prev.map((c) => c.id === updated.id ? updated : c));
  };

  const handleDelete = (id: string) => {
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      setActiveIndex(Math.min(activeIndex, Math.max(0, next.length - 1)));
      return next;
    });
  };

  const activeCard = cards[activeIndex];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 320, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            flexShrink: 0, height: "100%",
            borderLeft: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
            position: "relative",
          }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: "48px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
            <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
              Storyboard
            </span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <button
                onClick={() => void addCard()}
                disabled={adding || cards.length >= 10}
                title={cards.length >= 10 ? "Maximum 10 cards" : "Add scene card"}
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", color: cards.length >= 10 ? "var(--text-dim)" : "var(--text-muted)", cursor: cards.length >= 10 ? "not-allowed" : "pointer", fontSize: "11px", fontFamily: "var(--font-inter)", transition: "all 0.15s" }}>
                {adding
                  ? <Loader2 style={{ width: "11px", height: "11px" }} className="animate-spin" />
                  : <Plus style={{ width: "11px", height: "11px" }} />}
                Add
              </button>
              <button
                onClick={onClose}
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          {/* Card thumbnails */}
          {cards.length > 0 && (
            <div style={{ display: "flex", gap: "6px", padding: "10px 12px", overflowX: "auto", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
              {cards.map((card, i) => (
                <button
                  key={card.id}
                  onClick={() => setActiveIndex(i)}
                  style={{
                    flexShrink: 0, width: "56px", height: "72px",
                    border: `1px solid ${activeIndex === i ? "var(--gold-primary)" : "var(--border-color)"}`,
                    background: "var(--bg-elevated)",
                    cursor: "pointer", overflow: "hidden", padding: 0,
                    position: "relative",
                    outline: activeIndex === i ? "1px solid var(--gold-primary)" : "none",
                  }}>
                  {card.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={card.image_url}
                      alt={card.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: "9px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", textAlign: "center", padding: "2px" }}>
                        {card.title.slice(0, 12)}
                      </span>
                    </div>
                  )}
                  {/* Active indicator */}
                  {activeIndex === i && (
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: "var(--gold-primary)" }} />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          {cards.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 12px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
              <button
                onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                disabled={activeIndex === 0}
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "transparent", border: "none", color: activeIndex === 0 ? "var(--text-dim)" : "var(--text-muted)", cursor: activeIndex === 0 ? "not-allowed" : "pointer", fontSize: "11px", fontFamily: "var(--font-inter)" }}>
                <ChevronLeft style={{ width: "13px", height: "13px" }} />
                Prev
              </button>
              <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                {activeIndex + 1} / {cards.length}
              </span>
              <button
                onClick={() => setActiveIndex((i) => Math.min(cards.length - 1, i + 1))}
                disabled={activeIndex === cards.length - 1}
                style={{ display: "flex", alignItems: "center", gap: "4px", padding: "4px 8px", background: "transparent", border: "none", color: activeIndex === cards.length - 1 ? "var(--text-dim)" : "var(--text-muted)", cursor: activeIndex === cards.length - 1 ? "not-allowed" : "pointer", fontSize: "11px", fontFamily: "var(--font-inter)" }}>
                Next
                <ChevronRight style={{ width: "13px", height: "13px" }} />
              </button>
            </div>
          )}

          {/* Card content */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", paddingBottom: "80px", minHeight: 0,}}>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                <Loader2 style={{ width: "20px", height: "20px", color: "var(--gold-primary)" }} className="animate-spin" />
              </div>
            ) : cards.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
                <ImagePlus style={{ width: "32px", height: "32px", color: "var(--gold-primary)", opacity: 0.3, margin: "0 auto 1rem" }} />
                <p style={{ fontSize: "13px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", marginBottom: "8px" }}>
                  No scene cards yet.
                </p>
                <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", marginBottom: "1.5rem" }}>
                  Add up to 10 scene cards with images and notes.
                </p>
                <button
                  onClick={() => void addCard()}
                  style={{ padding: "8px 16px", background: "var(--gold-primary)", color: "var(--bg-primary)", border: "none", cursor: "pointer", fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  <Plus style={{ width: "13px", height: "13px" }} />
                  Add First Scene
                </button>
              </div>
            ) : activeCard ? (
              <CardEditor
                key={activeCard.id}
                card={activeCard}
                documentId={documentId}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ) : null}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}