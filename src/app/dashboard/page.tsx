"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Feather,
  Plus,
  Clock,
  Loader2,
  LogOut,
  BookMarked,
  ArrowRight,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/nextjs";

interface Document {
  id: string;
  title: string;
  genre: string | null;
  wordCount: number | null;
  updatedAt: Date | null;
}

export default function DashboardPage() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data: Document[]) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const formatDate = (d: Date | null) => {
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
    <div
      style={{
        background: "var(--bg-primary)",
        minHeight: "100vh",
        color: "var(--text-primary)",
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          background: "var(--topbar-bg)",
          borderBottom: "1px solid var(--border-color)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div
          style={{
            maxWidth: "1152px",
            margin: "0 auto",
            padding: "0 2rem",
            height: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Feather
              style={{
                width: "16px",
                height: "16px",
                color: "var(--gold-primary)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 700,
                fontSize: "15px",
                letterSpacing: "-0.02em",
              }}
            >
              Inkwell
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-inter)",
              }}
            >
              {user?.emailAddresses[0]?.emailAddress}
            </span>
            <button
              onClick={() => void signOut(() => router.push("/"))}
              style={{
                color: "var(--text-muted)",
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
                  "var(--text-muted)";
              }}
            >
              <LogOut style={{ width: "16px", height: "16px" }} />
            </button>
          </div>
        </div>
      </nav>

      <div
        style={{
          maxWidth: "1152px",
          margin: "0 auto",
          padding: "7rem 2rem 4rem",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            marginBottom: "3rem",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "0.75rem",
              }}
            >
              <div
                style={{
                  width: "24px",
                  height: "1px",
                  background: "var(--gold-primary)",
                }}
              />
              <span
                style={{
                  fontSize: "11px",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 600,
                  letterSpacing: "0.12em",
                  color: "var(--gold-primary)",
                  textTransform: "uppercase",
                }}
              >
                Your manuscripts
              </span>
            </div>
            <h1
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 900,
                fontSize: "2.5rem",
                letterSpacing: "-0.04em",
                lineHeight: 1.0,
                color: "var(--text-primary)",
              }}
            >
              {loading
                ? "Loading…"
                : documents.length === 0
                  ? "Start your story."
                  : `${documents.length} work${documents.length !== 1 ? "s" : ""}.`}
            </h1>
          </div>
          <button
            onClick={() => router.push("/editor/new")}
            className="btn-gold"
            style={{
              padding: "10px 20px",
              fontSize: "13px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              border: "none",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            <Plus style={{ width: "16px", height: "16px" }} />
            New document
          </button>
        </div>

        {/* Gold line */}
        <div
          style={{
            height: "1px",
            background: "var(--gold-primary)",
            opacity: 0.2,
            marginBottom: "3rem",
          }}
        />

        {loading ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: "6rem",
            }}
          >
            <Loader2
              style={{
                width: "20px",
                height: "20px",
                color: "var(--gold-primary)",
              }}
              className="animate-spin"
            />
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              textAlign: "center",
              padding: "6rem 2rem",
              border: "1px solid var(--border-color)",
            }}
          >
            <Feather
              style={{
                width: "32px",
                height: "32px",
                color: "var(--gold-primary)",
                opacity: 0.4,
                margin: "0 auto 1rem",
              }}
            />
            <h2
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 700,
                fontSize: "1.25rem",
                marginBottom: "8px",
                color: "var(--text-primary)",
              }}
            >
              Nothing here yet.
            </h2>
            <p
              style={{
                fontSize: "13px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-inter)",
                marginBottom: "1.5rem",
              }}
            >
              Every great story starts with a blank page.
            </p>
            <button
              onClick={() => router.push("/editor/new")}
              className="btn-gold"
              style={{
                padding: "10px 24px",
                fontSize: "13px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                border: "none",
                cursor: "pointer",
              }}
            >
              <Plus style={{ width: "14px", height: "14px" }} />
              Write something
            </button>
          </motion.div>
        ) : (
          <div>
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 120px 100px 120px 40px",
                gap: "1rem",
                paddingBottom: "10px",
                borderBottom: "1px solid var(--border-color)",
                marginBottom: "4px",
              }}
            >
              {["Title", "Genre", "Words", "Updated", ""].map((h, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    color: "var(--text-dim)",
                    textTransform: "uppercase",
                  }}
                >
                  {h}
                </span>
              ))}
            </div>

            {/* Rows */}
            {documents.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
              >
                <Link
                  href={`/editor/${doc.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 100px 120px 40px",
                      gap: "1rem",
                      padding: "14px 0",
                      borderBottom: "1px solid var(--border-subtle)",
                      alignItems: "center",
                      transition: "background 0.1s",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "var(--bg-surface)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background =
                        "transparent";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        minWidth: 0,
                      }}
                    >
                      <Feather
                        style={{
                          width: "13px",
                          height: "13px",
                          color: "var(--gold-primary)",
                          opacity: 0.5,
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontFamily: "var(--font-dm-sans)",
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "var(--text-primary)",
                          letterSpacing: "-0.01em",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.title || "Untitled"}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "11px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 500,
                        color: doc.genre
                          ? "var(--gold-primary)"
                          : "var(--text-dim)",
                        letterSpacing: "0.04em",
                      }}
                    >
                      {doc.genre ?? "—"}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-inter)",
                      }}
                    >
                      {(doc.wordCount ?? 0).toLocaleString()}
                    </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Clock
                        style={{
                          width: "11px",
                          height: "11px",
                          color: "var(--text-dim)",
                        }}
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-inter)",
                        }}
                      >
                        {formatDate(doc.updatedAt)}
                      </span>
                    </div>
                    <ArrowRight
                      style={{
                        width: "14px",
                        height: "14px",
                        color: "var(--gold-primary)",
                        opacity: 0,
                      }}
                      className="group-hover:opacity-100"
                    />
                  </div>
                </Link>

                {/* Bible link */}
                <div
                  style={{
                    paddingBottom: "4px",
                    paddingLeft: "23px",
                    borderBottom: "1px solid var(--border-subtle)",
                    marginTop: "-1px",
                  }}
                >
                  <Link
                    href={`/bible/${doc.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--font-inter)",
                      color: "var(--text-dim)",
                      textDecoration: "none",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--gold-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-dim)";
                    }}
                  >
                    <BookMarked style={{ width: "11px", height: "11px" }} />
                    Story Bible
                  </Link>
                </div>
              </motion.div>
            ))}

            {/* New document row */}
            <button
              onClick={() => router.push("/editor/new")}
              style={{
                width: "100%",
                padding: "14px 0",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                background: "transparent",
                border: "none",
                borderBottom: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "background 0.1s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "transparent";
              }}
            >
              <Plus
                style={{
                  width: "13px",
                  height: "13px",
                  color: "var(--gold-primary)",
                  opacity: 0.5,
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--text-dim)",
                  fontFamily: "var(--font-inter)",
                }}
              >
                New document
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
