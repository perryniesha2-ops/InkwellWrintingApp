"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Feather, Plus, Clock, Loader2, LogOut,
  BookMarked, ArrowRight, Trash2, FileUp,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/hooks/useUser";
import { importDocx } from "@/lib/importDocx";

interface Document {
  id: string;
  user_id?: string;
  title: string;
  genre: string | null;
  word_count: number | null;
  updated_at: string | null;
  cover_image: string | null;
}

export default function DashboardPage() {
  const { user } = useUser();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    fetch("/api/documents")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data: Document[]) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load documents:", err);
        setLoading(false);
      });
  }, [user]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth");
    router.refresh();
  };

  const createDocument = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", content: "" }),
      });
      if (!res.ok) throw new Error("Failed to create document");
      const doc = (await res.json()) as Document;
      router.push(`/editor/${doc.id}`);
    } catch (err) {
      console.error(err);
      setCreating(false);
    }
  };

  // New book from a Word file. Chapters are split from its headings when the
  // editor first opens it.
  const importDocument = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const book = await importDocx(file);
      const res = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: book.title, content: book.html }),
      });
      if (!res.ok) throw new Error("Couldn't create the book. Please try again.");
      const doc = (await res.json()) as Document;
      router.push(`/editor/${doc.id}`);
    } catch (err) {
      setImportError((err as Error).message);
      setImporting(false);
    }
  };

  const deleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this document? This cannot be undone.")) return;
    setDeleting(docId);
    try {
      await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (d: string | null) => {
    if (!d) return "";
    const date = new Date(d);
    const now = new Date();
    const days = Math.floor((now.getTime() - date.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", color: "var(--text-primary)" }}>

      {/* Nav */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--topbar-bg)", borderBottom: "1px solid var(--border-color)",
        backdropFilter: "blur(20px)",
      }}>
        <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "0 2rem", height: "56px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Feather style={{ width: "16px", height: "16px", color: "var(--gold-primary)" }} />
            <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "15px", letterSpacing: "-0.02em" }}>
              Prosr
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
              {user?.email}
            </span>
            <button
              onClick={() => void handleSignOut()}
              style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "var(--font-inter)", transition: "color 0.15s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
              <LogOut style={{ width: "14px", height: "14px" }} />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: "1152px", margin: "0 auto", padding: "7rem 2rem 4rem" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "3rem" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "0.75rem" }}>
              <div style={{ width: "24px", height: "1px", background: "var(--gold-primary)" }} />
              <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.12em", color: "var(--gold-primary)", textTransform: "uppercase" }}>
                Your manuscripts
              </span>
            </div>
            <h1 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 900, fontSize: "2.5rem", letterSpacing: "-0.04em", lineHeight: 1.0, color: "var(--text-primary)" }}>
              {loading ? "Loading…" : documents.length === 0 ? "Start your story." : `${documents.length} work${documents.length !== 1 ? "s" : ""}.`}
            </h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
            <button
              onClick={() => importInputRef.current?.click()}
              disabled={importing}
              title="Import a Word document (.docx)"
              style={{ padding: "10px 16px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "1px solid var(--border-color)", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "var(--font-inter)" }}>
              {importing
                ? <Loader2 style={{ width: "15px", height: "15px" }} className="animate-spin" />
                : <FileUp style={{ width: "15px", height: "15px" }} />}
              Import .docx
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.doc"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void importDocument(file);
              }}
            />
            <button
              onClick={() => void createDocument()}
              disabled={creating}
              className="btn-gold"
              style={{ padding: "10px 20px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px", border: "none", cursor: "pointer" }}>
              <Plus style={{ width: "16px", height: "16px" }} />
              New document
            </button>
          </div>
        </div>
        {importError && (
          <p style={{ margin: "-2rem 0 2rem", fontSize: "13px", fontFamily: "var(--font-inter)", color: "#ef4444" }}>{importError}</p>
        )}

        {/* Gold line */}
        <div style={{ height: "1px", background: "var(--gold-primary)", opacity: 0.2, marginBottom: "3rem" }} />

        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "6rem" }}>
            <Loader2 style={{ width: "20px", height: "20px", color: "var(--gold-primary)" }} className="animate-spin" />
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ textAlign: "center", padding: "6rem 2rem", border: "1px solid var(--border-color)" }}>
            <Feather style={{ width: "32px", height: "32px", color: "var(--gold-primary)", opacity: 0.4, margin: "0 auto 1rem" }} />
            <h2 style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "1.25rem", marginBottom: "8px", color: "var(--text-primary)" }}>
              Nothing here yet.
            </h2>
            <p style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-inter)", marginBottom: "1.5rem" }}>
              Every great story starts with a blank page.
            </p>
            <button
              onClick={() => void createDocument()}
              disabled={creating}
              className="btn-gold"
              style={{ padding: "10px 24px", fontSize: "13px", display: "inline-flex", alignItems: "center", gap: "8px", border: "none", cursor: "pointer" }}>
              <Plus style={{ width: "14px", height: "14px" }} />
              Write something
            </button>
          </motion.div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 100px 120px 40px 40px", gap: "1rem", paddingBottom: "10px", borderBottom: "1px solid var(--border-color)", marginBottom: "4px" }}>
              {["", "Title", "Genre", "Words", "Updated", "", ""].map((h, i) => (
                <span key={i} style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.1em", color: "var(--text-dim)", textTransform: "uppercase" }}>
                  {h}
                </span>
              ))}
            </div>

            {/* Document rows */}
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}>
                <Link href={`/editor/${doc.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{ display: "grid", gridTemplateColumns: "40px 1fr 120px 100px 120px 40px 40px", gap: "1rem", padding: "10px 0", borderBottom: "1px solid var(--border-color)", alignItems: "center", transition: "background 0.1s", cursor: "pointer" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>

                    {/* Cover thumbnail */}
                    <div style={{ width: "32px", height: "48px", flexShrink: 0 }}>
                      {doc.cover_image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={doc.cover_image}
                          alt=""
                          style={{ width: "32px", height: "48px", objectFit: "cover", border: "1px solid var(--border-color)", display: "block" }}
                        />
                      ) : (
                        <div style={{ width: "32px", height: "48px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Feather style={{ width: "12px", height: "12px", color: "var(--text-dim)" }} />
                        </div>
                      )}
                    </div>

                    {/* Title */}
                    <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 600, fontSize: "14px", color: "var(--text-primary)", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                        {doc.title || "Untitled"}
                      </span>
                      {doc.user_id && doc.user_id !== user?.id && (
                        <span style={{ flexShrink: 0, fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--gold-primary)", border: "1px solid var(--gold-border)", padding: "1px 6px" }}>
                          Shared with you
                        </span>
                      )}
                    </div>

                    {/* Genre */}
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-inter)", fontWeight: 500, color: doc.genre ? "var(--gold-primary)" : "var(--text-dim)" }}>
                      {doc.genre ?? "—"}
                    </span>

                    {/* Words */}
                    <span style={{ fontSize: "13px", color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                      {(doc.word_count ?? 0).toLocaleString()}
                    </span>

                    {/* Updated */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <Clock style={{ width: "11px", height: "11px", color: "var(--text-dim)" }} />
                      <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-inter)" }}>
                        {formatDate(doc.updated_at)}
                      </span>
                    </div>

                    {/* Arrow */}
                    <ArrowRight style={{ width: "14px", height: "14px", color: "var(--gold-primary)", opacity: 0.4 }} />

                    {/* Delete (owner only; collaborators can't delete a shared book) */}
                    {doc.user_id && doc.user_id !== user?.id ? <span /> : <button
                      onClick={(e) => void deleteDocument(doc.id, e)}
                      disabled={deleting === doc.id}
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "center",
                        width: "28px", height: "28px",
                        background: "transparent", border: "none",
                        color: "var(--text-dim)", cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "#ef4444";
                        (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.08)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.color = "var(--text-dim)";
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}>
                      {deleting === doc.id
                        ? <Loader2 style={{ width: "13px", height: "13px" }} className="animate-spin" />
                        : <Trash2 style={{ width: "13px", height: "13px" }} />}
                    </button>}
                  </div>
                </Link>

                {/* Bible link */}
                <div style={{ paddingBottom: "4px", paddingLeft: "56px", borderBottom: "1px solid var(--border-color)", marginTop: "-1px" }}>
                  <Link
                    href={`/bible/${doc.id}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", textDecoration: "none" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--gold-primary)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
                    <BookMarked style={{ width: "11px", height: "11px" }} />
                    Story Bible
                  </Link>
                </div>
              </motion.div>
            ))}

            {/* New document row */}
            <button
              onClick={() => void createDocument()}
              disabled={creating}
              style={{ width: "100%", padding: "14px 0", display: "flex", alignItems: "center", gap: "10px", background: "transparent", border: "none", borderBottom: "1px solid var(--border-color)", cursor: "pointer", transition: "background 0.1s" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-surface)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <div style={{ width: "40px", display: "flex", justifyContent: "center" }}>
                <Plus style={{ width: "13px", height: "13px", color: "var(--gold-primary)", opacity: 0.5 }} />
              </div>
              <span style={{ fontSize: "13px", color: "var(--text-dim)", fontFamily: "var(--font-inter)" }}>
                New document
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}