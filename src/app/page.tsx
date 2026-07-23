"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Feather,
  Zap,
  Shield,
  BookOpen,
  BarChart2,
  Sparkles,
  Check,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    label: "Context-Aware AI",
    desc: "Knows your characters, world, and arc. Every suggestion stays consistent with your Story Bible.",
  },
  {
    icon: Shield,
    label: "Consistency Checker",
    desc: "Scan your manuscript against your Story Bible. Catch contradictions before your readers do.",
  },
  {
    icon: BookOpen,
    label: "Chapter Proofreader",
    desc: "AI-powered prose analysis — missing words, awkward phrasing, tense shifts. Real editing, not spell check.",
  },
  {
    icon: BarChart2,
    label: "Readability Analysis",
    desc: "Flesch scores, sentence variety, passive voice, dialogue ratio. Know your prose inside out.",
  },
  {
    icon: Zap,
    label: "Inline AI",
    desc: "Select any passage. Improve, expand, add tension, convert to dialogue without leaving your flow.",
  },
  {
    icon: Feather,
    label: "Story Bible",
    desc: "Structured character profiles, chapter outlines, world building. Everything your AI needs.",
  },
];

const INKWELL_HAS = [
  "AI trained on your Story Bible",
  "Chapter-by-chapter proofreader",
  "Consistency checker vs. your characters",
  "Readability & prose analysis",
  "Scene illustrator with prompt gen",
  "Context-aware suggestions",
];

const OTHERS_LACK = [
  "Static spreadsheets, no AI",
  "AI that forgets your characters",
  "No proofreading or analysis",
  "Generic suggestions for any genre",
  "Copy-paste to image tools",
  "No story context awareness",
];

export default function LandingPage() {
  return (
    <div
      style={{
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        minHeight: "100vh",
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
                color: "var(--text-primary)",
              }}
            >
              Prosr
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            <Link
              href="/sign-in"
              style={{
                fontSize: "13px",
                fontFamily: "var(--font-inter)",
                color: "var(--text-muted)",
                textDecoration: "none",
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
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="btn-gold"
              style={{
                padding: "8px 16px",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                textDecoration: "none",
              }}
            >
              Get started{" "}
              <ArrowRight style={{ width: "14px", height: "14px" }} />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          maxWidth: "1152px",
          margin: "0 auto",
          padding: "10rem 2rem 6rem",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "2rem",
            }}
          >
            <div
              style={{
                width: "32px",
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
              AI Writing Assistant for Fiction Authors
            </span>
          </div>

          <h1
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 900,
              fontSize: "clamp(3rem, 7vw, 5.5rem)",
              letterSpacing: "-0.04em",
              lineHeight: 1.0,
              marginBottom: "1.5rem",
              color: "var(--text-primary)",
            }}
          >
            Write the story
            <br />
            <span
              style={{
                background:
                  "linear-gradient(135deg, var(--gold-light), var(--gold-primary))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              you&apos;ve been carrying.
            </span>
          </h1>

          <p
            style={{
              fontSize: "16px",
              color: "var(--text-secondary)",
              maxWidth: "480px",
              lineHeight: 1.7,
              marginBottom: "2.5rem",
              fontFamily: "var(--font-inter)",
              fontWeight: 400,
            }}
          >
            A writing environment built for fiction authors. AI that knows your
            characters, tracks your world, and edits your prose.
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <Link
              href="/sign-up"
              className="btn-gold"
              style={{
                padding: "12px 24px",
                fontSize: "14px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textDecoration: "none",
              }}
            >
              Start writing free{" "}
              <ArrowRight style={{ width: "16px", height: "16px" }} />
            </Link>
            <span
              style={{
                fontSize: "12px",
                color: "var(--text-muted)",
                fontFamily: "var(--font-inter)",
              }}
            >
              No credit card required
            </span>
          </div>

          <div
            style={{
              height: "1px",
              background: "var(--border-color)",
              marginTop: "5rem",
              opacity: 0.4,
            }}
          />
        </motion.div>
      </section>

      {/* Features */}
      <section
        style={{ maxWidth: "1152px", margin: "0 auto", padding: "5rem 2rem" }}
      >
        <div style={{ marginBottom: "3rem" }}>
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
            What Prosr does
          </span>
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 800,
              fontSize: "2.25rem",
              letterSpacing: "-0.03em",
              marginTop: "0.75rem",
              color: "var(--text-primary)",
            }}
          >
            Every tool a serious
            <br />
            fiction writer needs.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: "1px",
            background: "var(--border-color)",
            border: "1px solid var(--border-color)",
          }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              style={{
                background: "var(--bg-primary)",
                padding: "1.5rem",
                transition: "background 0.15s",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--bg-surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.background =
                  "var(--bg-primary)";
              }}
            >
              <f.icon
                style={{
                  width: "16px",
                  height: "16px",
                  color: "var(--gold-primary)",
                  marginBottom: "1rem",
                }}
              />
              <h3
                style={{
                  fontFamily: "var(--font-dm-sans)",
                  fontWeight: 700,
                  fontSize: "15px",
                  marginBottom: "8px",
                  color: "var(--text-primary)",
                  letterSpacing: "-0.01em",
                }}
              >
                {f.label}
              </h3>
              <p
                style={{
                  fontSize: "13px",
                  color: "var(--text-muted)",
                  lineHeight: 1.65,
                  fontFamily: "var(--font-inter)",
                }}
              >
                {f.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section
        style={{ maxWidth: "1152px", margin: "0 auto", padding: "5rem 2rem" }}
      >
        <div style={{ marginBottom: "3rem" }}>
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
            Why Prosr
          </span>
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 800,
              fontSize: "2.25rem",
              letterSpacing: "-0.03em",
              marginTop: "0.75rem",
              color: "var(--text-primary)",
            }}
          >
            Not a template.
            <br />
            Not a chatbot.
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1px",
            background: "var(--border-color)",
            border: "1px solid var(--border-color)",
          }}
        >
          {/* Others */}
          <div style={{ padding: "2rem", background: "var(--bg-primary)" }}>
            <p
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--text-dim)",
                textTransform: "uppercase",
                marginBottom: "1.5rem",
              }}
            >
              Notion templates / generic AI
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {OTHERS_LACK.map((item) => (
                <div
                  key={item}
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <span
                    style={{
                      color: "#ef4444",
                      fontSize: "12px",
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    ✕
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-muted)",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Prosr */}
          <div
            style={{
              padding: "2rem",
              background: "var(--bg-surface)",
              borderLeft: "2px solid var(--gold-primary)",
            }}
          >
            <p
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-inter)",
                fontWeight: 600,
                letterSpacing: "0.12em",
                color: "var(--gold-primary)",
                textTransform: "uppercase",
                marginBottom: "1.5rem",
              }}
            >
              Prosr
            </p>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {INKWELL_HAS.map((item) => (
                <div
                  key={item}
                  style={{ display: "flex", alignItems: "center", gap: "12px" }}
                >
                  <Check
                    style={{
                      width: "14px",
                      height: "14px",
                      color: "var(--gold-primary)",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: "13px",
                      color: "var(--text-primary)",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{ maxWidth: "1152px", margin: "0 auto", padding: "6rem 2rem" }}
      >
        <div
          style={{
            height: "1px",
            background: "var(--border-color)",
            marginBottom: "4rem",
            opacity: 0.3,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "2rem",
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 900,
              fontSize: "clamp(2rem, 5vw, 3.5rem)",
              letterSpacing: "-0.04em",
              lineHeight: 1.05,
              color: "var(--text-primary)",
            }}
          >
            The story isn&apos;t going
            <br />
            to write itself.
          </h2>
          <Link
            href="/sign-up"
            className="btn-gold"
            style={{
              padding: "12px 32px",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              textDecoration: "none",
              flexShrink: 0,
            }}
          >
            Open Prosr{" "}
            <ArrowRight style={{ width: "16px", height: "16px" }} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid var(--border-color)" }}>
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
                width: "14px",
                height: "14px",
                color: "var(--gold-primary)",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 700,
                fontSize: "13px",
                color: "var(--text-muted)",
              }}
            >
              Prosr
            </span>
          </div>
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-dim)",
              fontFamily: "var(--font-inter)",
            }}
          >
            Built for writers who finish.
          </p>
        </div>
      </footer>
    </div>
  );
}
