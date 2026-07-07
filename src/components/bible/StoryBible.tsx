"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Feather,
  ChevronLeft,
  Plus,
  Loader2,
  Save,
  Users,
  BookOpen,
  Globe,
  FileText,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────

interface Character {
  id: string;
  name: string;
  nickname?: string | null;
  role?: string | null;
  age?: string | null;
  gender?: string | null;
  occupation?: string | null;
  heightBuild?: string | null;
  hair?: string | null;
  eyes?: string | null;
  skinTone?: string | null;
  distinguishingFeatures?: string | null;
  style?: string | null;
  firstImpression?: string | null;
  traits?: string[] | null;
  loveLanguage?: string | null;
  greatestStrength?: string | null;
  fatalFlaw?: string | null;
  fears?: string | null;
  secrets?: string | null;
  underPressure?: string | null;
  speechPatterns?: string | null;
  backstory?: string | null;
  familySituation?: string | null;
  definingMoment?: string | null;
  education?: string | null;
  greatestRegret?: string | null;
  externalGoal?: string | null;
  internalNeed?: string | null;
  relationshipToMc?: string | null;
  characterArc?: string | null;
  characterSecrets?: string | null;
  attachmentStyle?: string | null;
  howTheyLove?: string | null;
  relationshipSabotage?: string | null;
  partnerTraits?: string | null;
  emotionalWound?: string | null;
  notes?: string | null;
  color?: string | null;
}

interface OutlineSection {
  id: string;
  title: string;
  type?: string | null;
  orderIndex?: number | null;
  content?: string | null;
  povCharacter?: string | null;
  timeline?: string | null;
  location?: string | null;
  openingHook?: string | null;
  closingBeat?: string | null;
  keyEvents?: string | null;
  purpose?: string | null;
  conflict?: string | null;
  stakes?: string | null;
  secretsRevealed?: string | null;
  emotionalStart?: string | null;
  emotionalEnd?: string | null;
  readerFeels?: string | null;
  pacing?: string | null;
  themes?: string | null;
  foreshadowing?: string | null;
  callbacks?: string | null;
  craftNotes?: string | null;
}

interface WorldEntry {
  id: string;
  title: string;
  category?: string | null;
  oneLine?: string | null;
  content?: string | null;
  history?: string | null;
  rules?: string | null;
  exceptions?: string | null;
  whoKnows?: string | null;
  looksLike?: string | null;
  soundsLike?: string | null;
  feelsLike?: string | null;
  atmosphere?: string | null;
  plotRelevance?: string | null;
  connectedCharacters?: string | null;
  firstIntroduced?: string | null;
  significance?: string | null;
}

interface BibleNote {
  id: string;
  title: string;
  content?: string | null;
}

interface StoryBible {
  id: string;
  documentId: string;
}

// ── Field components ───────────────────────────────────

function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
}) {
  const base = {
    width: "100%",
    background: "var(--bg-elevated)",
    border: "1px solid var(--border-color)",
    color: "var(--text-primary)",
    padding: "8px 10px",
    fontSize: "13px",
    fontFamily: "var(--font-inter)",
    outline: "none",
    transition: "border-color 0.15s",
    borderRadius: "0",
  };

  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "10px",
          fontFamily: "var(--font-inter)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--text-dim)",
          marginBottom: "4px",
        }}
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ ...base, resize: "vertical", lineHeight: 1.6 }}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--gold-primary)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-color)";
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={base}
          onFocus={(e) => {
            e.target.style.borderColor = "var(--gold-primary)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "var(--border-color)";
          }}
        />
      )}
    </div>
  );
}

function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ marginBottom: "1px" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "10px 16px",
          background: "var(--bg-elevated)",
          border: "none",
          borderBottom: "1px solid var(--border-color)",
          cursor: "pointer",
          transition: "background 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--bg-overlay)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.background =
            "var(--bg-elevated)";
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontFamily: "var(--font-inter)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-muted)",
          }}
        >
          {title}
        </span>
        {open ? (
          <ChevronUp
            style={{ width: "13px", height: "13px", color: "var(--text-dim)" }}
          />
        ) : (
          <ChevronDown
            style={{ width: "13px", height: "13px", color: "var(--text-dim)" }}
          />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            <div
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                background: "var(--bg-surface)",
              }}
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main component ─────────────────────────────────────

interface StoryBiblePageProps {
  id: string;
}

export function StoryBiblePage({ id }: StoryBiblePageProps) {
  const { user } = useUser();
  const router = useRouter();

  const [bible, setBible] = useState<StoryBible | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "characters" | "outline" | "world" | "notes"
  >("characters");

  const [characters, setCharacters] = useState<Character[]>([]);
  const [activeCharacter, setActiveCharacter] = useState<Character | null>(
    null,
  );

  const [outlineSections, setOutlineSections] = useState<OutlineSection[]>([]);
  const [activeSection, setActiveSection] = useState<OutlineSection | null>(
    null,
  );

  const [worldEntries, setWorldEntries] = useState<WorldEntry[]>([]);
  const [activeWorld, setActiveWorld] = useState<WorldEntry | null>(null);

  const [notes, setNotes] = useState<BibleNote[]>([]);
  const [activeNote, setActiveNote] = useState<BibleNote | null>(null);

  const [docTitle, setDocTitle] = useState("Your Story");

  // Load everything
  useEffect(() => {
    if (!user) return;
    fetch(`/api/bible/${id}`)
      .then((r) => r.json())
      .then(
        (data: {
          bible: StoryBible;
          characters: Character[];
          outline: OutlineSection[];
          world: WorldEntry[];
          notes: BibleNote[];
          docTitle: string;
        }) => {
          setBible(data.bible);
          setCharacters(data.characters ?? []);
          setOutlineSections(data.outline ?? []);
          setWorldEntries(data.world ?? []);
          setNotes(data.notes ?? []);
          setDocTitle(data.docTitle ?? "Your Story");
          setLoading(false);
        },
      )
      .catch(() => {
        router.push("/dashboard");
      });
  }, [id, user, router]);

  // ── Characters ──────────────────────────────────────

  const addCharacter = async () => {
    if (!bible) return;
    const res = await fetch(`/api/bible/${bible.id}/characters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Character" }),
    });
    const char = (await res.json()) as Character;
    setCharacters((prev) => [...prev, char]);
    setActiveCharacter(char);
  };

  const saveCharacter = async (char: Character) => {
    setSaving(true);
    try {
      await fetch(`/api/bible/${bible?.id}/characters/${char.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(char),
      });
      setCharacters((prev) => prev.map((c) => (c.id === char.id ? char : c)));
    } finally {
      setSaving(false);
    }
  };

  const deleteCharacter = async (charId: string) => {
    await fetch(`/api/bible/${bible?.id}/characters/${charId}`, {
      method: "DELETE",
    });
    setCharacters((prev) => prev.filter((c) => c.id !== charId));
    if (activeCharacter?.id === charId) setActiveCharacter(null);
  };

  // ── Outline ─────────────────────────────────────────

  const addSection = async () => {
    if (!bible) return;
    const res = await fetch(`/api/bible/${bible.id}/outline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: "New Chapter",
        type: "chapter",
        orderIndex: outlineSections.length,
      }),
    });
    const section = (await res.json()) as OutlineSection;
    setOutlineSections((prev) => [...prev, section]);
    setActiveSection(section);
  };

  const saveSection = async (section: OutlineSection) => {
    setSaving(true);
    try {
      await fetch(`/api/bible/${bible?.id}/outline/${section.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(section),
      });
      setOutlineSections((prev) =>
        prev.map((s) => (s.id === section.id ? section : s)),
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    await fetch(`/api/bible/${bible?.id}/outline/${sectionId}`, {
      method: "DELETE",
    });
    setOutlineSections((prev) => prev.filter((s) => s.id !== sectionId));
    if (activeSection?.id === sectionId) setActiveSection(null);
  };

  // ── World ────────────────────────────────────────────

  const addWorldEntry = async () => {
    if (!bible) return;
    const res = await fetch(`/api/bible/${bible.id}/world`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Entry", category: "location" }),
    });
    const entry = (await res.json()) as WorldEntry;
    setWorldEntries((prev) => [...prev, entry]);
    setActiveWorld(entry);
  };

  const saveWorldEntry = async (entry: WorldEntry) => {
    setSaving(true);
    try {
      await fetch(`/api/bible/${bible?.id}/world/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      setWorldEntries((prev) =>
        prev.map((w) => (w.id === entry.id ? entry : w)),
      );
    } finally {
      setSaving(false);
    }
  };

  const deleteWorldEntry = async (entryId: string) => {
    await fetch(`/api/bible/${bible?.id}/world/${entryId}`, {
      method: "DELETE",
    });
    setWorldEntries((prev) => prev.filter((w) => w.id !== entryId));
    if (activeWorld?.id === entryId) setActiveWorld(null);
  };

  // ── Notes ────────────────────────────────────────────

  const addNote = async () => {
    if (!bible) return;
    const res = await fetch(`/api/bible/${bible.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Note" }),
    });
    const note = (await res.json()) as BibleNote;
    setNotes((prev) => [...prev, note]);
    setActiveNote(note);
  };

  const saveNote = async (note: BibleNote) => {
    setSaving(true);
    try {
      await fetch(`/api/bible/${bible?.id}/notes/${note.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note),
      });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = async (noteId: string) => {
    await fetch(`/api/bible/${bible?.id}/notes/${noteId}`, {
      method: "DELETE",
    });
    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    if (activeNote?.id === noteId) setActiveNote(null);
  };

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

  const TABS = [
    {
      id: "characters",
      label: "Characters",
      icon: Users,
      count: characters.length,
    },
    {
      id: "outline",
      label: "Outline",
      icon: BookOpen,
      count: outlineSections.length,
    },
    { id: "world", label: "World", icon: Globe, count: worldEntries.length },
    { id: "notes", label: "Notes", icon: FileText, count: notes.length },
  ] as const;

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "0 16px",
          height: "48px",
          borderBottom: "1px solid var(--border-color)",
          background: "var(--topbar-bg)",
          backdropFilter: "blur(20px)",
          flexShrink: 0,
        }}
      >
        <Link
          href={`/editor/${id}`}
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
            (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
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
        <div style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-dm-sans)",
              fontWeight: 700,
              fontSize: "15px",
              letterSpacing: "-0.02em",
              color: "var(--text-primary)",
            }}
          >
            Story Bible
          </span>
          <span
            style={{
              fontSize: "12px",
              fontFamily: "var(--font-inter)",
              color: "var(--text-muted)",
              marginLeft: "8px",
            }}
          >
            {docTitle}
          </span>
        </div>
        {saving && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-inter)",
              color: "var(--text-dim)",
            }}
          >
            <Loader2
              style={{ width: "12px", height: "12px" }}
              className="animate-spin"
            />
            Saving
          </div>
        )}
      </div>

      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div
          style={{
            width: "260px",
            flexShrink: 0,
            borderRight: "1px solid var(--border-color)",
            background: "var(--bg-surface)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              borderBottom: "1px solid var(--border-color)",
              flexShrink: 0,
            }}
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 16px",
                  background:
                    activeTab === tab.id ? "var(--gold-subtle)" : "transparent",
                  border: "none",
                  borderLeft:
                    activeTab === tab.id
                      ? "2px solid var(--gold-primary)"
                      : "2px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  textAlign: "left",
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id)
                    (e.currentTarget as HTMLElement).style.background =
                      "var(--bg-elevated)";
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id)
                    (e.currentTarget as HTMLElement).style.background =
                      "transparent";
                }}
              >
                <tab.icon
                  style={{
                    width: "14px",
                    height: "14px",
                    color:
                      activeTab === tab.id
                        ? "var(--gold-primary)"
                        : "var(--text-muted)",
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: "12px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 500,
                    color:
                      activeTab === tab.id
                        ? "var(--gold-primary)"
                        : "var(--text-muted)",
                    flex: 1,
                  }}
                >
                  {tab.label}
                </span>
                {tab.count > 0 && (
                  <span
                    style={{
                      fontSize: "10px",
                      fontFamily: "var(--font-inter)",
                      color: "var(--text-dim)",
                    }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* List */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {/* Characters list */}
            {activeTab === "characters" && (
              <div>
                <div style={{ padding: "8px" }}>
                  <button
                    onClick={() => void addCharacter()}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "transparent",
                      border: "1px dashed var(--border-color)",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--gold-border)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--gold-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border-color)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-muted)";
                    }}
                  >
                    <Plus style={{ width: "13px", height: "13px" }} />
                    Add Character
                  </button>
                </div>
                {characters.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => setActiveCharacter(char)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      background:
                        activeCharacter?.id === char.id
                          ? "var(--gold-subtle)"
                          : "transparent",
                      border: "none",
                      borderLeft:
                        activeCharacter?.id === char.id
                          ? "2px solid var(--gold-primary)"
                          : "2px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (activeCharacter?.id !== char.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      if (activeCharacter?.id !== char.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                    }}
                  >
                    <div
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "50%",
                        background: char.color ?? "var(--bg-elevated)",
                        border: "1px solid var(--border-color)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-dm-sans)",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                        }}
                      >
                        {char.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "12px",
                          fontFamily: "var(--font-inter)",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {char.name}
                      </p>
                      {char.role && (
                        <p
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-inter)",
                            color: "var(--text-dim)",
                            margin: 0,
                          }}
                        >
                          {char.role}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Outline list */}
            {activeTab === "outline" && (
              <div>
                <div style={{ padding: "8px" }}>
                  <button
                    onClick={() => void addSection()}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "transparent",
                      border: "1px dashed var(--border-color)",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--gold-border)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--gold-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border-color)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-muted)";
                    }}
                  >
                    <Plus style={{ width: "13px", height: "13px" }} />
                    Add Chapter
                  </button>
                </div>
                {outlineSections.map((section, i) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      background:
                        activeSection?.id === section.id
                          ? "var(--gold-subtle)"
                          : "transparent",
                      border: "none",
                      borderLeft:
                        activeSection?.id === section.id
                          ? "2px solid var(--gold-primary)"
                          : "2px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (activeSection?.id !== section.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      if (activeSection?.id !== section.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                    }}
                  >
                    <span
                      style={{
                        fontSize: "10px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 600,
                        color: "var(--text-dim)",
                        flexShrink: 0,
                        width: "20px",
                      }}
                    >
                      {i + 1}
                    </span>
                    <span
                      style={{
                        fontSize: "12px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {section.title}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* World list */}
            {activeTab === "world" && (
              <div>
                <div style={{ padding: "8px" }}>
                  <button
                    onClick={() => void addWorldEntry()}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "transparent",
                      border: "1px dashed var(--border-color)",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--gold-border)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--gold-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border-color)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-muted)";
                    }}
                  >
                    <Plus style={{ width: "13px", height: "13px" }} />
                    Add Entry
                  </button>
                </div>
                {worldEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => setActiveWorld(entry)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      background:
                        activeWorld?.id === entry.id
                          ? "var(--gold-subtle)"
                          : "transparent",
                      border: "none",
                      borderLeft:
                        activeWorld?.id === entry.id
                          ? "2px solid var(--gold-primary)"
                          : "2px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (activeWorld?.id !== entry.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      if (activeWorld?.id !== entry.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "12px",
                          fontFamily: "var(--font-inter)",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          margin: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {entry.title}
                      </p>
                      {entry.category && (
                        <p
                          style={{
                            fontSize: "10px",
                            fontFamily: "var(--font-inter)",
                            color: "var(--text-dim)",
                            margin: 0,
                          }}
                        >
                          {entry.category}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Notes list */}
            {activeTab === "notes" && (
              <div>
                <div style={{ padding: "8px" }}>
                  <button
                    onClick={() => void addNote()}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "8px 10px",
                      background: "transparent",
                      border: "1px dashed var(--border-color)",
                      cursor: "pointer",
                      color: "var(--text-muted)",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      transition: "all 0.15s",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--gold-border)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--gold-primary)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor =
                        "var(--border-color)";
                      (e.currentTarget as HTMLElement).style.color =
                        "var(--text-muted)";
                    }}
                  >
                    <Plus style={{ width: "13px", height: "13px" }} />
                    Add Note
                  </button>
                </div>
                {notes.map((note) => (
                  <button
                    key={note.id}
                    onClick={() => setActiveNote(note)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "10px 16px",
                      background:
                        activeNote?.id === note.id
                          ? "var(--gold-subtle)"
                          : "transparent",
                      border: "none",
                      borderLeft:
                        activeNote?.id === note.id
                          ? "2px solid var(--gold-primary)"
                          : "2px solid transparent",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (activeNote?.id !== note.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "var(--bg-elevated)";
                    }}
                    onMouseLeave={(e) => {
                      if (activeNote?.id !== note.id)
                        (e.currentTarget as HTMLElement).style.background =
                          "transparent";
                    }}
                  >
                    <span
                      style={{
                        fontSize: "12px",
                        fontFamily: "var(--font-inter)",
                        fontWeight: 500,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {note.title}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail panel */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            background: "var(--bg-primary)",
          }}
        >
          {/* Character detail */}
          {activeTab === "characters" && activeCharacter && (
            <div
              style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  {activeCharacter.name || "Unnamed Character"}
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => void saveCharacter(activeCharacter)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background: "var(--gold-primary)",
                      color: "var(--bg-primary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      fontWeight: 600,
                    }}
                  >
                    <Save style={{ width: "13px", height: "13px" }} />
                    Save
                  </button>
                  <button
                    onClick={() => void deleteCharacter(activeCharacter.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 12px",
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                    }}
                  >
                    <Trash2 style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>
              </div>

              <Section title="Identity">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <Field
                    label="Name"
                    value={activeCharacter.name}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, name: v })
                    }
                  />
                  <Field
                    label="Nickname"
                    value={activeCharacter.nickname ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, nickname: v })
                    }
                  />
                  <Field
                    label="Role"
                    value={activeCharacter.role ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, role: v })
                    }
                    placeholder="Protagonist, Antagonist..."
                  />
                  <Field
                    label="Age"
                    value={activeCharacter.age ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, age: v })
                    }
                  />
                  <Field
                    label="Gender"
                    value={activeCharacter.gender ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, gender: v })
                    }
                  />
                  <Field
                    label="Occupation"
                    value={activeCharacter.occupation ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, occupation: v })
                    }
                  />
                </div>
              </Section>

              <Section title="Physical">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <Field
                    label="Height & Build"
                    value={activeCharacter.heightBuild ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, heightBuild: v })
                    }
                  />
                  <Field
                    label="Hair"
                    value={activeCharacter.hair ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, hair: v })
                    }
                  />
                  <Field
                    label="Eyes"
                    value={activeCharacter.eyes ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, eyes: v })
                    }
                  />
                  <Field
                    label="Skin Tone"
                    value={activeCharacter.skinTone ?? ""}
                    onChange={(v) =>
                      setActiveCharacter({ ...activeCharacter, skinTone: v })
                    }
                  />
                </div>
                <Field
                  label="Distinguishing Features"
                  value={activeCharacter.distinguishingFeatures ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      distinguishingFeatures: v,
                    })
                  }
                  multiline
                />
                <Field
                  label="Style & Fashion"
                  value={activeCharacter.style ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, style: v })
                  }
                  multiline
                />
                <Field
                  label="First Impression"
                  value={activeCharacter.firstImpression ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      firstImpression: v,
                    })
                  }
                  multiline
                />
              </Section>

              <Section title="Personality">
                <Field
                  label="Core Traits (comma separated)"
                  value={activeCharacter.traits?.join(", ") ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      traits: v
                        .split(",")
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                />
                <Field
                  label="Love Language"
                  value={activeCharacter.loveLanguage ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, loveLanguage: v })
                  }
                />
                <Field
                  label="Greatest Strength"
                  value={activeCharacter.greatestStrength ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      greatestStrength: v,
                    })
                  }
                  multiline
                />
                <Field
                  label="Fatal Flaw"
                  value={activeCharacter.fatalFlaw ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, fatalFlaw: v })
                  }
                  multiline
                />
                <Field
                  label="Fears"
                  value={activeCharacter.fears ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, fears: v })
                  }
                  multiline
                />
                <Field
                  label="Secrets"
                  value={activeCharacter.secrets ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, secrets: v })
                  }
                  multiline
                />
                <Field
                  label="Under Pressure"
                  value={activeCharacter.underPressure ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, underPressure: v })
                  }
                  multiline
                />
                <Field
                  label="Speech Patterns"
                  value={activeCharacter.speechPatterns ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      speechPatterns: v,
                    })
                  }
                  multiline
                />
              </Section>

              <Section title="Background">
                <Field
                  label="Backstory"
                  value={activeCharacter.backstory ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, backstory: v })
                  }
                  multiline
                />
                <Field
                  label="Family Situation"
                  value={activeCharacter.familySituation ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      familySituation: v,
                    })
                  }
                  multiline
                />
                <Field
                  label="Defining Moment"
                  value={activeCharacter.definingMoment ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      definingMoment: v,
                    })
                  }
                  multiline
                />
                <Field
                  label="Education"
                  value={activeCharacter.education ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, education: v })
                  }
                />
                <Field
                  label="Greatest Regret"
                  value={activeCharacter.greatestRegret ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      greatestRegret: v,
                    })
                  }
                  multiline
                />
              </Section>

              <Section title="Story Role">
                <Field
                  label="External Goal"
                  value={activeCharacter.externalGoal ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, externalGoal: v })
                  }
                  multiline
                />
                <Field
                  label="Internal Need"
                  value={activeCharacter.internalNeed ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, internalNeed: v })
                  }
                  multiline
                />
                <Field
                  label="Relationship to MC"
                  value={activeCharacter.relationshipToMc ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      relationshipToMc: v,
                    })
                  }
                  multiline
                />
                <Field
                  label="Character Arc"
                  value={activeCharacter.characterArc ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, characterArc: v })
                  }
                  multiline
                />
                <Field
                  label="Notes"
                  value={activeCharacter.notes ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, notes: v })
                  }
                  multiline
                />
              </Section>

              <Section title="Romance" defaultOpen={false}>
                <Field
                  label="Attachment Style"
                  value={activeCharacter.attachmentStyle ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      attachmentStyle: v,
                    })
                  }
                />
                <Field
                  label="How They Love"
                  value={activeCharacter.howTheyLove ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, howTheyLove: v })
                  }
                  multiline
                />
                <Field
                  label="How They Sabotage Relationships"
                  value={activeCharacter.relationshipSabotage ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      relationshipSabotage: v,
                    })
                  }
                  multiline
                />
                <Field
                  label="What They Need in a Partner"
                  value={activeCharacter.partnerTraits ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({ ...activeCharacter, partnerTraits: v })
                  }
                  multiline
                />
                <Field
                  label="Emotional Wound"
                  value={activeCharacter.emotionalWound ?? ""}
                  onChange={(v) =>
                    setActiveCharacter({
                      ...activeCharacter,
                      emotionalWound: v,
                    })
                  }
                  multiline
                />
              </Section>
            </div>
          )}

          {/* Outline detail */}
          {activeTab === "outline" && activeSection && (
            <div
              style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  {activeSection.title || "Untitled Chapter"}
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => void saveSection(activeSection)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background: "var(--gold-primary)",
                      color: "var(--bg-primary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      fontWeight: 600,
                    }}
                  >
                    <Save style={{ width: "13px", height: "13px" }} />
                    Save
                  </button>
                  <button
                    onClick={() => void deleteSection(activeSection.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 12px",
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    <Trash2 style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>
              </div>

              <Section title="Basics">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <Field
                    label="Title"
                    value={activeSection.title}
                    onChange={(v) =>
                      setActiveSection({ ...activeSection, title: v })
                    }
                  />
                  <Field
                    label="Type"
                    value={activeSection.type ?? ""}
                    onChange={(v) =>
                      setActiveSection({ ...activeSection, type: v })
                    }
                    placeholder="chapter, scene, prologue..."
                  />
                  <Field
                    label="POV Character"
                    value={activeSection.povCharacter ?? ""}
                    onChange={(v) =>
                      setActiveSection({ ...activeSection, povCharacter: v })
                    }
                  />
                  <Field
                    label="Timeline"
                    value={activeSection.timeline ?? ""}
                    onChange={(v) =>
                      setActiveSection({ ...activeSection, timeline: v })
                    }
                  />
                  <Field
                    label="Location"
                    value={activeSection.location ?? ""}
                    onChange={(v) =>
                      setActiveSection({ ...activeSection, location: v })
                    }
                  />
                </div>
                <Field
                  label="Summary"
                  value={activeSection.content ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, content: v })
                  }
                  multiline
                />
              </Section>

              <Section title="Plot">
                <Field
                  label="Opening Hook"
                  value={activeSection.openingHook ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, openingHook: v })
                  }
                  multiline
                />
                <Field
                  label="Key Events"
                  value={activeSection.keyEvents ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, keyEvents: v })
                  }
                  multiline
                />
                <Field
                  label="Conflict"
                  value={activeSection.conflict ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, conflict: v })
                  }
                  multiline
                />
                <Field
                  label="Stakes"
                  value={activeSection.stakes ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, stakes: v })
                  }
                  multiline
                />
                <Field
                  label="Secrets Revealed"
                  value={activeSection.secretsRevealed ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, secretsRevealed: v })
                  }
                  multiline
                />
                <Field
                  label="Closing Beat"
                  value={activeSection.closingBeat ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, closingBeat: v })
                  }
                  multiline
                />
              </Section>

              <Section title="Emotion">
                <Field
                  label="Character Emotional State (Start)"
                  value={activeSection.emotionalStart ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, emotionalStart: v })
                  }
                  multiline
                />
                <Field
                  label="Character Emotional State (End)"
                  value={activeSection.emotionalEnd ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, emotionalEnd: v })
                  }
                  multiline
                />
                <Field
                  label="What the Reader Should Feel"
                  value={activeSection.readerFeels ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, readerFeels: v })
                  }
                  multiline
                />
                <Field
                  label="Pacing"
                  value={activeSection.pacing ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, pacing: v })
                  }
                  placeholder="slow burn, fast-paced, tension-building..."
                />
              </Section>

              <Section title="Craft">
                <Field
                  label="Themes"
                  value={activeSection.themes ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, themes: v })
                  }
                  multiline
                />
                <Field
                  label="Foreshadowing"
                  value={activeSection.foreshadowing ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, foreshadowing: v })
                  }
                  multiline
                />
                <Field
                  label="Callbacks"
                  value={activeSection.callbacks ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, callbacks: v })
                  }
                  multiline
                />
                <Field
                  label="Craft Notes"
                  value={activeSection.craftNotes ?? ""}
                  onChange={(v) =>
                    setActiveSection({ ...activeSection, craftNotes: v })
                  }
                  multiline
                />
              </Section>
            </div>
          )}

          {/* World detail */}
          {activeTab === "world" && activeWorld && (
            <div
              style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                }}
              >
                <h2
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                  }}
                >
                  {activeWorld.title || "Untitled Entry"}
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => void saveWorldEntry(activeWorld)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background: "var(--gold-primary)",
                      color: "var(--bg-primary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      fontWeight: 600,
                    }}
                  >
                    <Save style={{ width: "13px", height: "13px" }} />
                    Save
                  </button>
                  <button
                    onClick={() => void deleteWorldEntry(activeWorld.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 12px",
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    <Trash2 style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>
              </div>

              <Section title="Details">
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <Field
                    label="Title"
                    value={activeWorld.title}
                    onChange={(v) =>
                      setActiveWorld({ ...activeWorld, title: v })
                    }
                  />
                  <Field
                    label="Category"
                    value={activeWorld.category ?? ""}
                    onChange={(v) =>
                      setActiveWorld({ ...activeWorld, category: v })
                    }
                    placeholder="location, magic, faction, event..."
                  />
                </div>
                <Field
                  label="One-Line Summary"
                  value={activeWorld.oneLine ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, oneLine: v })
                  }
                />
                <Field
                  label="Description"
                  value={activeWorld.content ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, content: v })
                  }
                  multiline
                />
                <Field
                  label="History"
                  value={activeWorld.history ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, history: v })
                  }
                  multiline
                />
                <Field
                  label="Rules"
                  value={activeWorld.rules ?? ""}
                  onChange={(v) => setActiveWorld({ ...activeWorld, rules: v })}
                  multiline
                />
                <Field
                  label="Exceptions"
                  value={activeWorld.exceptions ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, exceptions: v })
                  }
                  multiline
                />
                <Field
                  label="Who Knows About This"
                  value={activeWorld.whoKnows ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, whoKnows: v })
                  }
                  multiline
                />
              </Section>

              <Section title="Sensory">
                <Field
                  label="Looks Like"
                  value={activeWorld.looksLike ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, looksLike: v })
                  }
                  multiline
                />
                <Field
                  label="Sounds Like"
                  value={activeWorld.soundsLike ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, soundsLike: v })
                  }
                  multiline
                />
                <Field
                  label="Feels Like"
                  value={activeWorld.feelsLike ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, feelsLike: v })
                  }
                  multiline
                />
                <Field
                  label="Atmosphere"
                  value={activeWorld.atmosphere ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, atmosphere: v })
                  }
                  multiline
                />
              </Section>

              <Section title="Story Role">
                <Field
                  label="Plot Relevance"
                  value={activeWorld.plotRelevance ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, plotRelevance: v })
                  }
                  multiline
                />
                <Field
                  label="Connected Characters"
                  value={activeWorld.connectedCharacters ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, connectedCharacters: v })
                  }
                  multiline
                />
                <Field
                  label="First Introduced"
                  value={activeWorld.firstIntroduced ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, firstIntroduced: v })
                  }
                />
                <Field
                  label="Significance"
                  value={activeWorld.significance ?? ""}
                  onChange={(v) =>
                    setActiveWorld({ ...activeWorld, significance: v })
                  }
                  multiline
                />
              </Section>
            </div>
          )}

          {/* Notes detail */}
          {activeTab === "notes" && activeNote && (
            <div
              style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem" }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "1.5rem",
                }}
              >
                <input
                  value={activeNote.title}
                  onChange={(e) =>
                    setActiveNote({ ...activeNote, title: e.target.value })
                  }
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 800,
                    fontSize: "1.5rem",
                    letterSpacing: "-0.03em",
                    color: "var(--text-primary)",
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    flex: 1,
                  }}
                  placeholder="Note title"
                />
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => void saveNote(activeNote)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 14px",
                      background: "var(--gold-primary)",
                      color: "var(--bg-primary)",
                      border: "none",
                      cursor: "pointer",
                      fontSize: "12px",
                      fontFamily: "var(--font-inter)",
                      fontWeight: 600,
                    }}
                  >
                    <Save style={{ width: "13px", height: "13px" }} />
                    Save
                  </button>
                  <button
                    onClick={() => void deleteNote(activeNote.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "7px 12px",
                      background: "transparent",
                      border: "1px solid rgba(239,68,68,0.3)",
                      color: "#f87171",
                      cursor: "pointer",
                      fontSize: "12px",
                    }}
                  >
                    <Trash2 style={{ width: "13px", height: "13px" }} />
                  </button>
                </div>
              </div>
              <textarea
                value={activeNote.content ?? ""}
                onChange={(e) =>
                  setActiveNote({ ...activeNote, content: e.target.value })
                }
                placeholder="Write your notes here…"
                style={{
                  width: "100%",
                  minHeight: "400px",
                  resize: "none",
                  outline: "none",
                  background: "transparent",
                  border: "none",
                  fontFamily: "var(--font-cormorant)",
                  fontSize: "16px",
                  lineHeight: 1.8,
                  color: "var(--text-primary)",
                  caretColor: "var(--gold-primary)",
                }}
              />
            </div>
          )}

          {/* Empty states */}
          {activeTab === "characters" &&
            !activeCharacter &&
            characters.length === 0 && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  textAlign: "center",
                  padding: "3rem",
                }}
              >
                <Users
                  style={{
                    width: "40px",
                    height: "40px",
                    color: "var(--gold-primary)",
                    opacity: 0.3,
                    marginBottom: "1rem",
                  }}
                />
                <h3
                  style={{
                    fontFamily: "var(--font-dm-sans)",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                    color: "var(--text-primary)",
                    marginBottom: "8px",
                  }}
                >
                  No characters yet
                </h3>
                <p
                  style={{
                    fontSize: "13px",
                    fontFamily: "var(--font-inter)",
                    color: "var(--text-muted)",
                    marginBottom: "1.5rem",
                  }}
                >
                  Add your first character to start building your Story Bible.
                </p>
                <button
                  onClick={() => void addCharacter()}
                  style={{
                    padding: "10px 20px",
                    background: "var(--gold-primary)",
                    color: "var(--bg-primary)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontFamily: "var(--font-inter)",
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Plus style={{ width: "14px", height: "14px" }} /> Add
                  Character
                </button>
              </div>
            )}

          {activeTab === "characters" &&
            !activeCharacter &&
            characters.length > 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <p
                  style={{
                    fontSize: "13px",
                    fontFamily: "var(--font-inter)",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  Select a character to view details
                </p>
              </div>
            )}

          {activeTab === "outline" && !activeSection && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--font-inter)",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                {outlineSections.length === 0
                  ? "Add your first chapter to start outlining."
                  : "Select a chapter to view details"}
              </p>
            </div>
          )}

          {activeTab === "world" && !activeWorld && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--font-inter)",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                {worldEntries.length === 0
                  ? "Add your first world entry to start building."
                  : "Select an entry to view details"}
              </p>
            </div>
          )}

          {activeTab === "notes" && !activeNote && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  fontFamily: "var(--font-inter)",
                  color: "var(--text-muted)",
                  fontStyle: "italic",
                }}
              >
                {notes.length === 0
                  ? "Add your first note."
                  : "Select a note to view details"}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
