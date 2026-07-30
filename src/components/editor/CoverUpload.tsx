"use client";

import { useState, useRef } from "react";
import { X, Loader2, ImagePlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";

interface CoverUploadProps {
  documentId: string;
  currentCover?: string | null;
  onUpdate: (url: string | null) => void;
}

export default function CoverUpload({ documentId, currentCover, onUpdate }: CoverUploadProps) {
  const { user, loading } = useUser();
  const [cover, setCover] = useState<string | null>(currentCover ?? null);
  const [removing, setRemoving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (loading) {
      setError("Still loading — please try again.");
      return;
    }

    if (!user) {
      setError("Not signed in.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("File too large. Max 8MB.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${documentId}.${ext}`;

      console.log("Uploading to path:", path);

      // Remove old cover if exists
      if (cover) {
        try {
          const oldUrl = new URL(cover);
          const pathParts = oldUrl.pathname.split("/cover-images/");
          if (pathParts[1]) {
            await supabase.storage.from("cover-images").remove([pathParts[1]]);
          }
        } catch {
          // ignore delete errors
        }
      }

      const { data, error: uploadError } = await supabase.storage
        .from("cover-images")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      console.log("Upload successful:", data.path);

      const { data: { publicUrl } } = supabase.storage
        .from("cover-images")
        .getPublicUrl(data.path);

      console.log("Public URL:", publicUrl);

      const patchRes = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: publicUrl }),
      });

      if (!patchRes.ok) {
        const errData = await patchRes.json() as { error?: string };
        throw new Error(errData.error ?? "Failed to save cover");
      }

      setCover(publicUrl);
      onUpdate(publicUrl);
    } catch (err) {
      console.error("Cover upload error:", err);
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    if (!user) return;
    setRemoving(true);
    setError(null);
    try {
      const supabase = createClient();

      if (cover) {
        try {
          const urlObj = new URL(cover);
          const pathParts = urlObj.pathname.split("/cover-images/");
          if (pathParts[1]) {
            await supabase.storage.from("cover-images").remove([pathParts[1]]);
          }
        } catch {
          // ignore delete errors
        }
      }

      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverImage: null }),
      });

      if (!res.ok) throw new Error("Failed to remove cover");

      setCover(null);
      onUpdate(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove cover.");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "160px" }}>

      {/* Cover preview */}
      {cover ? (
        <div style={{ position: "relative" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={cover}
            alt="Book cover"
            style={{
              width: "160px", height: "240px",
              objectFit: "cover",
              border: "1px solid var(--border-color)",
              display: "block",
            }}
          />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "2px", background: "var(--gold-primary)" }} />
          <div
            style={{
              position: "absolute", inset: 0,
              background: "rgba(0,0,0,0)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0.6)";
              const btn = (e.currentTarget as HTMLElement).querySelector("button");
              if (btn) btn.style.opacity = "1";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.background = "rgba(0,0,0,0)";
              const btn = (e.currentTarget as HTMLElement).querySelector("button");
              if (btn) btn.style.opacity = "0";
            }}>
            <button
              onClick={() => void handleRemove()}
              disabled={removing}
              style={{
                width: "32px", height: "32px",
                background: "rgba(239,68,68,0.9)",
                border: "none", color: "#fff",
                cursor: "pointer", opacity: 0,
                transition: "opacity 0.2s",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
              {removing
                ? <Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />
                : <X style={{ width: "14px", height: "14px" }} />}
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "160px", height: "240px",
            border: "1px dashed var(--border-color)",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "8px", background: "var(--bg-elevated)",
            cursor: "pointer", transition: "border-color 0.15s",
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

      {/* Error message */}
      {error && (
        <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "#f87171", margin: 0, textAlign: "center" }}>
          {error}
        </p>
      )}

      {/* Upload button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading || loading}
        style={{
          width: "160px", padding: "8px",
          background: cover ? "var(--bg-elevated)" : "var(--gold-primary)",
          color: cover ? "var(--text-muted)" : "var(--bg-primary)",
          border: cover ? "1px solid var(--border-color)" : "none",
          cursor: uploading || loading ? "not-allowed" : "pointer",
          fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600,
          display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
          transition: "all 0.15s",
          opacity: uploading || loading ? 0.7 : 1,
        }}>
        {uploading
          ? <><Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" /> Uploading…</>
          : loading
          ? <><Loader2 style={{ width: "12px", height: "12px" }} className="animate-spin" /> Loading…</>
          : cover ? "Change Cover" : "Upload Cover"}
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: "none" }}
        onChange={(e) => void handleUpload(e)}
      />

      <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", textAlign: "center", margin: 0 }}>
        JPG, PNG or WebP · Max 8MB
      </p>
    </div>
  );
}