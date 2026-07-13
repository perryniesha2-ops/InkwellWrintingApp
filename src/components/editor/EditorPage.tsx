"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  Feather,
  Save,
  ChevronLeft,
  Loader2,
  BookMarked,
  Maximize2,
  Minimize2,
  ShieldCheck,
  SpellCheck,
  BarChart2,
  MessageSquare,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Editor } from "@tiptap/react";
import type { Template } from "@/lib/templates";
import { useEditorPrefs } from "@/hooks/useEditorPrefs";
import { BookText } from "lucide-react";
import { Palette } from "lucide-react";

const WritingEditor = dynamic(
  () => import("@/components/editor/WritingEditor"),
  { ssr: false },
);
const OutlinePanel = dynamic(() => import("@/components/editor/OutlinePanel"), {
  ssr: false,
});
const GrammarChecker = dynamic(
  () => import("@/components/editor/GrammarChecker"),
  { ssr: false },
);
const ConsistencyChecker = dynamic(
  () => import("@/components/editor/ConsistencyChecker"),
  { ssr: false },
);
const ReadabilityPanel = dynamic(
  () => import("@/components/editor/ReadabilityPanel"),
  { ssr: false },
);
const ChatPanel = dynamic(() => import("@/components/chat/ChatPanel"), {
  ssr: false,
});
const ExportMenu = dynamic(() => import("@/components/editor/ExportMenu"), {
  ssr: false,
});
const TemplatePicker = dynamic(
  () => import("@/components/editor/TemplatePicker"),
  { ssr: false },
);
const EditorSettings = dynamic(
  () => import("@/components/editor/EditorSettings"),
  { ssr: false },
);
const ThesaurusPanel = dynamic(
  () => import("@/components/editor/ThesaurusPanel"),
  { ssr: false },
);
const SceneIllustrator = dynamic(
  () => import("@/components/editor/SceneIllustrator"),
  { ssr: false },
);

interface Document {
  id: string;
  title: string;
  content: string;
  genre: string | null;
  wordCount: number | null;
}

function ActionButton({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div className="relative group">
      <button
        onClick={onClick}
        style={{
          width: "36px",
          height: "36px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: active ? "var(--gold-subtle)" : "transparent",
          color: active ? "var(--gold-primary)" : "var(--text-muted)",
          border: active
            ? "1px solid var(--gold-border)"
            : "1px solid transparent",
          cursor: "pointer",
          transition: "all 0.15s",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background =
              "var(--bg-elevated)";
            (e.currentTarget as HTMLElement).style.color =
              "var(--text-primary)";
          }
        }}
        onMouseLeave={(e) => {
          if (!active) {
            (e.currentTarget as HTMLElement).style.background = "transparent";
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
          }
        }}
      >
        <Icon style={{ width: "15px", height: "15px" }} />
        {active && (
          <span
            style={{
              position: "absolute",
              top: "4px",
              right: "4px",
              width: "4px",
              height: "4px",
              background: "var(--gold-primary)",
            }}
          />
        )}
      </button>
      {/* Tooltip */}
      <div
        style={{
          position: "absolute",
          right: "calc(100% + 8px)",
          top: "50%",
          transform: "translateY(-50%)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-color)",
          color: "var(--text-primary)",
          fontSize: "11px",
          fontFamily: "var(--font-inter)",
          padding: "4px 8px",
          whiteSpace: "nowrap",
          pointerEvents: "none",
          opacity: 0,
          transition: "opacity 0.15s",
        }}
        className="group-hover:opacity-100"
      >
        {label}
      </div>
    </div>
  );
}

interface EditorPageProps {
  id: string;
}

export function EditorPage({ id }: EditorPageProps) {
  const router = useRouter();
  const { user } = useUser();

  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("Untitled");
  const [content, setContent] = useState("");
  const [genre, setGenre] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(id !== "new");
  const [showTemplates, setShowTemplates] = useState(id === "new");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [consistencyOpen, setConsistencyOpen] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [readabilityOpen, setReadabilityOpen] = useState(false);
  const [bibleContext, setBibleContext] = useState("");

  const { prefs, updatePrefs, editorStyle } = useEditorPrefs();

  const [thesaurusOpen, setThesaurusOpen] = useState(false);

  const [illustratorOpen, setIllustratorOpen] = useState(false);

  const titleRef = useRef(title);
  const contentRef = useRef(content);
  const genreRef = useRef(genre);
  const docRef = useRef(doc);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  useEffect(() => {
    genreRef.current = genre;
  }, [genre]);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  // Load document
  useEffect(() => {
    if (id === "new" || !user) return;
    fetch(`/api/documents/${id}`)
      .then((r) => {
        if (!r.ok) {
          router.push("/dashboard");
          return null;
        }
        return r.json();
      })
      .then((data: Document | null) => {
        if (!data) return;
        setDoc(data);
        setTitle(data.title);
        setContent(data.content);
        setGenre(data.genre ?? undefined);
        setLoading(false);
      });
  }, [id, user, router]);

  // Load bible context
  useEffect(() => {
    if (!doc?.id) return;
    fetch(`/api/bible/${doc.id}/context`)
      .then((r) => r.json())
      .then((data: { context: string }) => setBibleContext(data.context ?? ""))
      .catch(() => {});
  }, [doc?.id]);

  const saveDocument = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    try {
      const wordCount = contentRef.current
        .replace(/<[^>]+>/g, " ")
        .split(/\s+/)
        .filter(Boolean).length;

      if (docRef.current) {
        await fetch(`/api/documents/${docRef.current.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titleRef.current,
            content: contentRef.current,
            genre: genreRef.current ?? null,
            wordCount,
          }),
        });
      } else {
        const res = await fetch("/api/documents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: titleRef.current,
            content: contentRef.current,
            genre: genreRef.current ?? null,
            wordCount,
          }),
        });
        const newDoc = (await res.json()) as Document;
        setDoc(newDoc);
        router.replace(`/editor/${newDoc.id}`);
      }
      setLastSaved(new Date());
    } finally {
      setSaving(false);
    }
  }, [user, router]);

  // Auto-save
  useEffect(() => {
    if (!content) return;
    const timer = setTimeout(() => {
      void saveDocument();
    }, 3000);
    return () => clearTimeout(timer);
  }, [content, title, saveDocument]);

  const handleTemplateSelect = (template: Template) => {
    setGenre(template.genre === "Freewrite" ? undefined : template.genre);
    setContent(template.starterContent ?? "");
    setTitle("Untitled");
    setShowTemplates(false);
  };

  const openRightPanel = (
    panel:
      | "chat"
      | "consistency"
      | "grammar"
      | "readability"
      | "thesaurus"
      | "illustrator",
  ) => {
    setChatOpen(panel === "chat" ? (o) => !o : false);
    setConsistencyOpen(panel === "consistency" ? (o) => !o : false);
    setGrammarOpen(panel === "grammar" ? (o) => !o : false);
    setReadabilityOpen(panel === "readability" ? (o) => !o : false);
    setThesaurusOpen(panel === "thesaurus" ? (o) => !o : false);
    setIllustratorOpen(panel === "illustrator" ? (o) => !o : false);
  };

  const anyRightPanelOpen =
    (chatOpen ||
      consistencyOpen ||
      readabilityOpen ||
      grammarOpen ||
      thesaurusOpen ||
      illustratorOpen) &&
    !focusMode;

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg-primary)",
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
    );
  }

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-primary)",
      }}
    >
      {/* Top bar */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            initial={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -48 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "0 16px",
              height: "48px",
              flexShrink: 0,
              borderBottom: "1px solid var(--border-color)",
              background: "var(--topbar-bg)",
              backdropFilter: "blur(20px)",
            }}
          >
            <Link
              href="/dashboard"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
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
              <ChevronLeft style={{ width: "16px", height: "16px" }} />
            </Link>

            <Feather
              style={{
                width: "14px",
                height: "14px",
                color: "var(--gold-primary)",
                flexShrink: 0,
              }}
            />

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                outline: "none",
                border: "none",
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 700,
                fontSize: "15px",
                letterSpacing: "-0.02em",
                color: "var(--text-primary)",
              }}
              placeholder="Untitled"
            />

            {genre && (
              <span
                style={{
                  fontSize: "10px",
                  fontFamily: "var(--font-inter)",
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "3px 8px",
                  color: "var(--gold-primary)",
                  border: "1px solid var(--gold-border)",
                  flexShrink: 0,
                }}
              >
                {genre}
              </span>
            )}

            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-inter)",
                color: "var(--text-dim)",
                flexShrink: 0,
              }}
            >
              {saving ? (
                <span
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <Loader2
                    style={{ width: "12px", height: "12px" }}
                    className="animate-spin"
                  />
                  Saving
                </span>
              ) : lastSaved ? (
                `Saved ${lastSaved.toLocaleTimeString()}`
              ) : null}
            </span>

            <div
              style={{
                width: "1px",
                height: "16px",
                background: "var(--border-color)",
                flexShrink: 0,
              }}
            />

            <button
              onClick={() => void saveDocument()}
              className="btn-gold"
              style={{
                padding: "6px 12px",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <Save style={{ width: "13px", height: "13px" }} />
              Save
            </button>

            {EditorSettings && (
              <EditorSettings prefs={prefs} onUpdate={updatePrefs} />
            )}

            <div
              style={{
                width: "1px",
                height: "16px",
                background: "var(--border-color)",
                flexShrink: 0,
              }}
            />

            {doc && (
              <Link
                href={`/bible/${doc.id}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  fontFamily: "var(--font-inter)",
                  color: "var(--text-muted)",
                  textDecoration: "none",
                  flexShrink: 0,
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
                <BookMarked style={{ width: "13px", height: "13px" }} />
                <span>Bible</span>
              </Link>
            )}

            {ExportMenu && (
              <ExportMenu
                title={title}
                content={content}
                genre={genre}
                documentId={doc?.id}
              />
            )}

            <button
              onClick={() => setFocusMode(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                color: "var(--text-muted)",
                background: "none",
                border: "none",
                cursor: "pointer",
                flexShrink: 0,
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
              <Maximize2 style={{ width: "14px", height: "14px" }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main layout */}
      <div
        style={{ display: "flex", flex: 1, minHeight: 0, position: "relative" }}
      >
        {!focusMode && OutlinePanel && (
          <OutlinePanel
            editor={editor}
            isOpen={outlineOpen}
            onToggle={() => setOutlineOpen((o) => !o)}
          />
        )}

        <motion.div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            overflow: "hidden",
          }}
          animate={{ marginRight: anyRightPanelOpen ? "320px" : "0" }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
        >
          {!showTemplates && WritingEditor && (
            <WritingEditor
              content={content}
              onChange={setContent}
              editorStyle={editorStyle}
              onEditorReady={setEditor}
              genre={genre}
              bibleContext={bibleContext}
              focusMode={focusMode}
            />
          )}
        </motion.div>

        {/* Floating action bar */}
        <AnimatePresence>
          {!focusMode && (
            <motion.div
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                right: anyRightPanelOpen ? "332px" : "12px",
                top: "50%",
                transform: "translateY(-50%)",
                transition: "right 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
                background: "var(--bg-surface)",
                border: "1px solid var(--border-color)",
                padding: "4px",
                boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                zIndex: 30,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "20%",
                  right: "20%",
                  height: "1px",
                  background: "var(--gold-primary)",
                }}
              />
              {doc && (
                <ActionButton
                  icon={ShieldCheck}
                  label="Consistency Check"
                  active={consistencyOpen}
                  onClick={() => openRightPanel("consistency")}
                />
              )}
              <ActionButton
                icon={SpellCheck}
                label="Proofread Chapter"
                active={grammarOpen}
                onClick={() => openRightPanel("grammar")}
              />
              <ActionButton
                icon={BarChart2}
                label="Readability"
                active={readabilityOpen}
                onClick={() => openRightPanel("readability")}
              />
              <ActionButton
                icon={BookText}
                label="Thesaurus"
                active={thesaurusOpen}
                onClick={() => openRightPanel("thesaurus")}
              />
              <ActionButton
                icon={Palette}
                label="Scene Illustrator"
                active={illustratorOpen}
                onClick={() => openRightPanel("illustrator")}
              />
              <div
                style={{
                  height: "1px",
                  background: "var(--border-color)",
                  margin: "2px 0",
                }}
              />
              <ActionButton
                icon={MessageSquare}
                label="AI Assistant"
                active={chatOpen}
                onClick={() => openRightPanel("chat")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right panels */}
        {!focusMode && ChatPanel && (
          <ChatPanel
            documentContent={content}
            documentId={doc?.id}
            genre={genre}
            bibleContext={bibleContext}
            isOpen={chatOpen}
            onToggle={() => openRightPanel("chat")}
          />
        )}
        {ConsistencyChecker && (
          <ConsistencyChecker
            content={content}
            bibleContext={bibleContext}
            isOpen={consistencyOpen}
            onClose={() => setConsistencyOpen(false)}
          />
        )}
        {GrammarChecker && (
          <GrammarChecker
            content={content}
            genre={genre}
            editor={editor}
            isOpen={grammarOpen}
            onClose={() => setGrammarOpen(false)}
          />
        )}
        {ReadabilityPanel && (
          <ReadabilityPanel
            content={content}
            isOpen={readabilityOpen}
            onClose={() => setReadabilityOpen(false)}
          />
        )}
      </div>

      {/* Template picker */}
      {showTemplates && TemplatePicker && (
        <TemplatePicker
          onSelect={handleTemplateSelect}
          onClose={doc ? () => setShowTemplates(false) : undefined}
        />
      )}

      {ThesaurusPanel && (
        <ThesaurusPanel
          editor={editor}
          isOpen={thesaurusOpen}
          onClose={() => setThesaurusOpen(false)}
        />
      )}
      {SceneIllustrator && (
        <SceneIllustrator
          editor={editor}
          genre={genre}
          bibleContext={bibleContext}
          isOpen={illustratorOpen}
          onClose={() => setIllustratorOpen(false)}
        />
      )}

      {/* Focus mode exit */}
      <AnimatePresence>
        {focusMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1 }}
            style={{
              position: "fixed",
              bottom: "2rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 50,
            }}
          >
            <button
              onClick={() => setFocusMode(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 16px",
                fontSize: "11px",
                fontFamily: "var(--font-inter)",
                fontWeight: 500,
                background: "var(--bg-surface)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--gold-primary)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--gold-border)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.color =
                  "var(--text-muted)";
                (e.currentTarget as HTMLElement).style.borderColor =
                  "var(--border-color)";
              }}
            >
              <Minimize2 style={{ width: "12px", height: "12px" }} />
              Exit Focus Mode
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
