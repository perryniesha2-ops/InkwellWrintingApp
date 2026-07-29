"use client";

import { useState } from "react";
import { X, Loader2, Upload, ImagePlus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CoverUploadProps {
  documentId: string;
  currentCover?: string | null;
  onUpdate: (url: string | null) => void;
}

export default function CoverUpload({ documentId, currentCover, onUpdate }: CoverUploadProps) {
  const [cover, setCover] = useState<string | null>(currentCover ?? null);
  const [removing, setRemoving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleUploadComplete = async (files: FileList) => {
     const supabase = createClient();
  const newUrls: string[] = [];
    setUploading(false);

    await fetch(`/api/documents/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ coverImage: newUrls }),
    });

    setCover(newUrls[0]);
    onUpdate(newUrls[0]);
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: null }),
      });
      setCover(null);
      onUpdate(null);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "160px" }}>

      {/* Cover preview */}
      <div style={{ position: "relative" }}>
        {cover ? (
          <div style={{ position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={cover}
              alt="Book cover"
              style={{
                width: "160px",
                height: "240px",
                objectFit: "cover",
                border: "1px solid var(--border-color)",
                display: "block",
              }}
            />
            {/* Overlay on hover */}
            <div
              className="group"
              style={{
                position: "absolute", inset: 0,
                background: "rgba(0,0,0,0)",
                display: "flex", alignItems: "center",
                justifyContent: "center", gap: "8px",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.6)";
                const btns = (e.currentTarget as HTMLElement).querySelectorAll("button");
                btns.forEach((b) => { (b as HTMLElement).style.opacity = "1"; });
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)";
                const btns = (e.currentTarget as HTMLElement).querySelectorAll("button");
                btns.forEach((b) => { (b as HTMLElement).style.opacity = "0"; });
              }}>
              <button
                onClick={() => void handleRemove()}
                disabled={removing}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "32px", height: "32px",
                  background: "rgba(239,68,68,0.9)", border: "none",
                  color: "#fff", cursor: "pointer", opacity: 0,
                  transition: "opacity 0.2s",
                }}>
                {removing
                  ? <Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />
                  : <X style={{ width: "14px", height: "14px" }} />}
              </button>
            </div>

            {/* Gold accent bar at top */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "var(--gold-primary)" }} />
          </div>
        ) : (
          <div style={{
            width: "160px", height: "240px",
            border: "1px dashed var(--border-color)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "8px", background: "var(--bg-elevated)",
            transition: "border-color 0.15s",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)"; }}>
            <ImagePlus style={{ width: "24px", height: "24px", color: "var(--text-dim)" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, color: "var(--text-muted)", margin: "0 0 2px" }}>
                No cover
              </p>
              <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", margin: 0 }}>
                6×9 recommended
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload button */}
      <div style={{ position: "relative" }}>
        {uploading && (
          <div style={{
            position: "absolute", inset: 0, zIndex: 1,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "var(--gold-primary)",
            gap: "6px",
          }}>
            <Loader2 style={{ width: "12px", height: "12px", color: "var(--bg-primary)" }} className="animate-spin" />
            <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, color: "var(--bg-primary)" }}>
              Uploading…
            </span>
          </div>
        )}
      <label
  style={{
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: "6px", padding: "10px", width: "100%",
    background: "var(--bg-elevated)",
    border: "1px dashed var(--border-color)",
    cursor: "pointer", fontSize: "12px",
    fontFamily: "var(--font-inter)",
    color: "var(--text-muted)",
    transition: "all 0.15s",
    boxSizing: "border-box" as const,
  }}
  onMouseEnter={(e) => {
    (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)";
    (e.currentTarget as HTMLElement).style.color = "var(--gold-primary)";
  }}
  onMouseLeave={(e) => {
    (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
    (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
  }}>
  <Plus style={{ width: "13px", height: "13px" }} />
  Upload Images
  <input
    type="file"
    accept="image/*"
    multiple
    style={{ display: "none" }}
    onChange={(e) => {
      if (e.target.files && e.target.files.length > 0) {
        void handleUploadComplete(e.target.files);
      }
    }}
  />
</label>
      </div>

      {/* Info */}
      <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", textAlign: "center", margin: 0 }}>
        JPG or PNG · Max 8MB
      </p>
    </div>
  );
}