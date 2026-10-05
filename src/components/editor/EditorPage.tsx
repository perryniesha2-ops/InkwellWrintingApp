"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/hooks/useUser";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
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
  ImagePlus,
  Users,
  PenLine,
  StickyNote,
  LayoutList,
  History,
  Share2,
  NotebookPen,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { Editor } from "@tiptap/react";
import { useEditorPrefs } from "@/hooks/useEditorPrefs";
import { useStoryElements } from "@/hooks/useStoryElements";
import { useNotes } from "@/hooks/useNotes";
import type { NoteKind } from "@/lib/notes";
import type { NewElementType } from "@/lib/storyElements";
import type { OutlineTemplate } from "@/lib/outlineTemplates";
import GuidanceBanner from "@/components/editor/GuidanceBanner";
import { importDocx } from "@/lib/importDocx";
import { collabUser } from "@/lib/collab/identity";
import { useBookChannel } from "@/hooks/useBookChannel";
import {
  buildChapterTree, compileManuscript, countWords, flattenChapterTree, moveChapter, splitHtmlIntoChapters,
  type Chapter, type DropPosition,
} from "@/lib/chapters";
import { BookText } from "lucide-react";
import { Palette } from "lucide-react";
import { LayoutTemplate } from "lucide-react";


const WritingEditor = dynamic(
  () => import("@/components/editor/WritingEditor"),
  { ssr: false },
);
const ChapterSidebar = dynamic(() => import("@/components/editor/ChapterSidebar"), {
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
const CoverUpload = dynamic(
  () => import("@/components/editor/CoverUpload"),
  { ssr: false }
);

const Corkboard = dynamic(() => import("@/components/editor/Corkboard"), {
  ssr: false,
});
const TemplateGallery = dynamic(
  () => import("@/components/editor/TemplateGallery"),
  { ssr: false },
);

const ShareDialog = dynamic(() => import("@/components/editor/ShareDialog"), {
  ssr: false,
});

const RevisionPanel = dynamic(
  () => import("@/components/editor/RevisionPanel"),
  { ssr: false },
);

const NotesPanel = dynamic(() => import("@/components/editor/NotesPanel"), {
  ssr: false,
});

const StoryElementPanel = dynamic(
  () => import("@/components/editor/StoryElementPanel"),
  { ssr: false }
);

const StoryboardPanel = dynamic(
  () => import("@/components/editor/StoryboardPanel"),
  { ssr: false }
);


interface Document {
  id: string;
  title: string;
  content: string;
  genre: string | null;
  wordCount: number | null;
   coverImage: string | null;
  /** Owner, or a collaborator on the whole book / only some chapters. */
  access?: { role: "owner" | "editor"; scope: "book" | "chapters" };
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

const REVISION_INTERVAL_MS = 10 * 60 * 1000;

interface EditorPageProps {
  id: string;
}



export function EditorPage({ id }: EditorPageProps) {
  const router = useRouter();
  const { user } = useUser();

  const [doc, setDoc] = useState<Document | null>(null);
  const [title, setTitle] = useState("Untitled");
  const [genre, setGenre] = useState<string | undefined>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeChapterId, setActiveChapterId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [view, setView] = useState<"write" | "corkboard">("write");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [revisionsOpen, setRevisionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  // Bumped after an auto snapshot so the open history list refreshes.
  const [revisionTick, setRevisionTick] = useState(0);
  // Bumped after a restore to remount the editor with the restored content.
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [focusMode, setFocusMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [consistencyOpen, setConsistencyOpen] = useState(false);
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [readabilityOpen, setReadabilityOpen] = useState(false);
  const [bibleContext, setBibleContext] = useState("");

  const { prefs, updatePrefs, editorStyle } = useEditorPrefs();

  const [thesaurusOpen, setThesaurusOpen] = useState(false);

  const [illustratorOpen, setIllustratorOpen] = useState(false);

  const titleRef = useRef(title);
  const genreRef = useRef(genre);
  const docRef = useRef(doc);
  const chaptersRef = useRef(chapters);
  const activeChapterIdRef = useRef(activeChapterId);
  // Chapters whose content changed since the last save.
  const dirtyChaptersRef = useRef(new Set<string>());
  // Bumped on every edit; the autosave effect debounces on it.
  const [editTick, setEditTick] = useState(0);

  const [coverOpen, setCoverOpen] = useState(false);
 const [coverImage, setCoverImage] = useState<string | null>(null);

 const coverButtonRef = useRef<HTMLButtonElement>(null);
const [coverButtonPos, setCoverButtonPos] = useState({ top: 0, right: 0 });
const [storyboardOpen, setStoryboardOpen] = useState(false);
const [chatSelectedText, setChatSelectedText] = useState("");
  const [elementsOpen, setElementsOpen] = useState(false);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const storyElements = useStoryElements(doc?.id);
  const notesApi = useNotes(storyElements.bibleId, storyElements.noteRows);
  const [notesOpen, setNotesOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  // Live editor selection (empty when nothing is selected), for clipping to notes.
  const [editorSelection, setEditorSelection] = useState("");
  // Supabase hands out a new `user` object on every auth event (tab refocus,
  // hourly token refresh), so anything that should run once per sign-in keys
  // on the id. Keying on the object reloaded the book and jumped to chapter 1.
  const userId = user?.id ?? null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const me = useMemo(() => (user ? collabUser(user) : null), [userId]);
  const isOwner = doc?.access?.role !== "editor";
  // Owner or whole-book collaborator: can restructure, rename, edit the Story Bible.
  const canEditBook = isOwner || doc?.access?.scope === "book";

  const activeChapter = chapters.find((c) => c.id === activeChapterId) ?? null;
  // Per-chapter text for the proofreading/analysis panels.
  const content = activeChapter?.content ?? "";
  const manuscript = useMemo(() => compileManuscript(chapters), [chapters]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  useEffect(() => {
    genreRef.current = genre;
  }, [genre]);
  useEffect(() => {
    docRef.current = doc;
  }, [doc]);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);
  useEffect(() => {
    activeChapterIdRef.current = activeChapterId;
  }, [activeChapterId]);

  // Load document + chapters. "/editor/new" creates a blank document first.
  useEffect(() => {
    if (!userId) return;
    if (id === "new") {
      fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Untitled", content: "" }),
      })
        .then((r) => (r.ok ? r.json() : Promise.reject(r)))
        .then((newDoc: Document) => router.replace(`/editor/${newDoc.id}`))
        .catch(() => router.push("/dashboard"));
      return;
    }
    const getJson = async (url: string) => {
      const r = await fetch(url);
      const body = await r.json().catch(() => ({}));
      return { ok: r.ok, status: r.status, body };
    };
    Promise.all([getJson(`/api/documents/${id}`), getJson(`/api/documents/${id}/chapters`)]).then(([docRes, chRes]) => {
      if (docRes.status === 404 || docRes.status === 401) {
        router.push("/dashboard");
        return;
      }
      if (!docRes.ok || !chRes.ok) {
        // Show the problem instead of bouncing back to the dashboard.
        const detail = (chRes.ok ? docRes : chRes).body?.error;
        setLoadError(detail ? String(detail) : "This book couldn't be loaded.");
        setLoading(false);
        return;
      }
      const data = docRes.body as Document;
      const chapterRows = chRes.body as Chapter[];
      setDoc(data);
      setTitle(data.title);
      setGenre(data.genre ?? undefined);
      setCoverImage(data.coverImage ?? null);
      setChapters(chapterRows);
      // Invite links for a single chapter open that chapter (?chapter=…).
      const requested = new URLSearchParams(window.location.search).get("chapter");
      // Keep the open chapter if this is a reload; otherwise start at the
      // requested chapter or the first one.
      setActiveChapterId((current) =>
        current && chapterRows.some((c) => c.id === current)
          ? current
          : chapterRows.some((c) => c.id === requested)
            ? requested
            : flattenChapterTree(buildChapterTree(chapterRows))[0]?.id ?? null,
      );
      setLoading(false);
    });
  }, [id, userId, router]);

  // Load bible context
  useEffect(() => {
    if (!doc?.id) return;
    fetch(`/api/bible/${doc.id}/context`)
      .then((r) => r.json())
      .then((data: { context: string }) => setBibleContext(data.context ?? ""))
      .catch(() => {});
    // Refetch when the elements panel closes so AI tools see fresh edits.
  }, [doc?.id, elementsOpen]);


useEffect(() => {
  if (!editor) return;
  const updateSelection = () => {
    const { from, to } = editor.state.selection;
    const text = from === to ? "" : editor.state.doc.textBetween(from, to, "\n").trim();
    setEditorSelection(text);
    if (text.length > 20) setChatSelectedText(text.replace(/\s*\n\s*/g, " "));
  };
  editor.on("selectionUpdate", updateSelection);
  return () => { editor.off("selectionUpdate", updateSelection); };
}, [editor]);

  // ⌘\ / Ctrl+\ toggles the chapter sidebar.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        setSidebarCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Saves chapter HTML (the database recompiles documents.content from it for
  // exports and manuscript-level AI), then the book's title/genre. Chapter text
  // itself is saved keystroke-by-keystroke by live collaboration; this keeps
  // the HTML copy current.
  const saveDocument = useCallback(async () => {
    const d = docRef.current;
    if (!userId || !d) return;
    const dirty = [...dirtyChaptersRef.current];
    dirtyChaptersRef.current.clear();
    setSaving(true);
    try {
      const all = chaptersRef.current;
      const results = await Promise.all(
        dirty.map((cid) => {
          const c = all.find((x) => x.id === cid);
          return c
            ? fetch(`/api/documents/${d.id}/chapters/${cid}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: c.content }),
              }).then((r) => r.ok)
            : true;
        }),
      );
      const mayEditBook = d.access?.role !== "editor" || d.access?.scope === "book";
      const docOk = !mayEditBook || await fetch(`/api/documents/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: titleRef.current, genre: genreRef.current ?? null }),
      }).then((r) => r.ok);
      if (results.every(Boolean) && docOk) {
        setLastSaved(new Date());
      } else {
        dirty.forEach((cid) => dirtyChaptersRef.current.add(cid));
      }
    } catch {
      dirty.forEach((cid) => dirtyChaptersRef.current.add(cid));
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // Auto snapshot for revision history: every 10 minutes, only if edited.
  const lastSnapshotAtRef = useRef(0);
  const editedSinceSnapshotRef = useRef(false);
  useEffect(() => {
    if (editTick) editedSinceSnapshotRef.current = true;
  }, [editTick]);
  useEffect(() => {
    // Revision history is the owner's (collaborators can't read or restore it).
    if (!doc?.id || doc.access?.role === "editor") return;
    const docId = doc.id;
    lastSnapshotAtRef.current = Date.now();
    const timer = setInterval(async () => {
      if (!editedSinceSnapshotRef.current) return;
      if (Date.now() - lastSnapshotAtRef.current < REVISION_INTERVAL_MS) return;
      lastSnapshotAtRef.current = Date.now();
      editedSinceSnapshotRef.current = false;
      await saveDocument();
      const res = await fetch(`/api/documents/${docId}/revisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "auto" }),
      }).catch(() => null);
      if (res?.ok) setRevisionTick((t) => t + 1);
    }, 30_000);
    return () => clearInterval(timer);
  }, [doc?.id, doc?.access?.role, saveDocument]);

  const reloadAfterRestore = async () => {
    if (!doc) return;
    const [data, rows] = await Promise.all([
      fetch(`/api/documents/${doc.id}`).then((r) => (r.ok ? r.json() : null)) as Promise<Document | null>,
      fetch(`/api/documents/${doc.id}/chapters`).then((r) => (r.ok ? r.json() : null)) as Promise<Chapter[] | null>,
    ]);
    if (!data || !rows) return;
    dirtyChaptersRef.current.clear();
    setTitle(data.title);
    setChapters(rows);
    setActiveChapterId((current) =>
      rows.some((c) => c.id === current) ? current : flattenChapterTree(buildChapterTree(rows))[0]?.id ?? null,
    );
    setEditorEpoch((n) => n + 1);
  };

  // A collaborator added/renamed/moved/deleted chapters: refresh the list. The
  // open chapter's text is owned by the live editor, so keep our copy of it.
  const refreshChapters = async () => {
    if (!doc) return;
    const res = await fetch(`/api/documents/${doc.id}/chapters`);
    if (!res.ok) return;
    const rows = (await res.json()) as Chapter[];
    setChapters((prev) => {
      const local = new Map(prev.map((c) => [c.id, c]));
      return rows.map((r) =>
        r.id === activeChapterIdRef.current || dirtyChaptersRef.current.has(r.id)
          ? { ...r, content: local.get(r.id)?.content ?? r.content }
          : r,
      );
    });
    setActiveChapterId((current) =>
      rows.some((c) => c.id === current) ? current : flattenChapterTree(buildChapterTree(rows))[0]?.id ?? null,
    );
  };

  const { peers, notify } = useBookChannel(doc?.id, me, activeChapterId, {
    onTreeChanged: () => void refreshChapters(),
    onReload: () => void reloadAfterRestore(),
  });
  const notifyTree = () => notify("tree-changed");

  // Auto-save shortly after typing pauses.
  useEffect(() => {
    if (!editTick) return;
    const timer = setTimeout(() => {
      void saveDocument();
    }, 1000);
    return () => clearTimeout(timer);
  }, [editTick, saveDocument]);

  const markEdited = () => setEditTick((t) => t + 1);

  const handleContentChange = useCallback((html: string, remote: boolean) => {
    const cid = activeChapterIdRef.current;
    if (!cid) return;
    setChapters((prev) => prev.map((c) => (c.id === cid ? { ...c, content: html } : c)));
    // The collaborator who made a remote change saves it; only save our own.
    if (remote) return;
    dirtyChaptersRef.current.add(cid);
    setEditTick((t) => t + 1);
  }, []);

  const selectChapter = (chapterId: string) => {
    if (chapterId === activeChapterId) return;
    if (dirtyChaptersRef.current.size > 0) void saveDocument();
    setActiveChapterId(chapterId);
  };

  const addChapter = async (parentId: string | null) => {
    if (!doc) return;
    const siblings = chapters.filter((c) => c.parent_id === parentId);
    const res = await fetch(`/api/documents/${doc.id}/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        parentId,
        title: parentId ? `Scene ${siblings.length + 1}` : `Chapter ${siblings.length + 1}`,
        orderIndex: siblings.length,
      }),
    });
    if (!res.ok) return;
    const chapter = (await res.json()) as Chapter;
    setChapters((prev) => [...prev, chapter]);
    selectChapter(chapter.id);
    markEdited();
    notifyTree();
  };

  const renameChapter = (chapterId: string, newTitle: string) => {
    if (!doc) return;
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, title: newTitle } : c)));
    void fetch(`/api/documents/${doc.id}/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    }).then(notifyTree);
    markEdited();
  };

  const deleteChapter = async (chapterId: string) => {
    if (!doc) return;
    const removed = new Set(
      chapters.filter((c) => c.id === chapterId || c.parent_id === chapterId).map((c) => c.id),
    );
    if (removed.size === chapters.length) {
      alert("A book needs at least one chapter.");
      return;
    }
    const target = chapters.find((c) => c.id === chapterId);
    const extra = removed.size > 1 ? ` and its ${removed.size - 1} subchapter(s)` : "";
    if (!confirm(`Delete "${target?.title}"${extra}? This cannot be undone.`)) return;
    const res = await fetch(`/api/documents/${doc.id}/chapters/${chapterId}`, { method: "DELETE" });
    if (!res.ok) return;
    removed.forEach((cid) => dirtyChaptersRef.current.delete(cid));
    const remaining = chapters.filter((c) => !removed.has(c.id));
    setChapters(remaining);
    if (activeChapterId && removed.has(activeChapterId)) {
      setActiveChapterId(flattenChapterTree(buildChapterTree(remaining))[0]?.id ?? null);
    }
    markEdited();
    notifyTree();
  };

  const patchChapter = (chapterId: string, patch: Partial<Pick<Chapter, "synopsis" | "guidance">>) => {
    if (!doc) return;
    setChapters((prev) => prev.map((c) => (c.id === chapterId ? { ...c, ...patch } : c)));
    void fetch(`/api/documents/${doc.id}/chapters/${chapterId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(notifyTree);
  };

  // A fresh book: one chapter, nothing written. Templates replace it.
  const bookIsEmpty =
    chapters.length === 1 && countWords(chapters[0].content) === 0;

  type NewChapterTree = { title: string; content?: string; guidance?: string; children?: { title: string; content?: string; guidance?: string }[] }[];

  // Appends chapters after the existing ones (replacing a fresh book's blank
  // first chapter) and selects the first new one if the blank was showing.
  const appendChapters = async (newChapters: NewChapterTree): Promise<boolean> => {
    if (!doc) return false;
    const res = await fetch(`/api/documents/${doc.id}/chapters/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chapters: newChapters,
        replaceChapterId: bookIsEmpty ? chapters[0].id : undefined,
      }),
    });
    if (!res.ok) return false;
    const { created, removedId } = (await res.json()) as { created: Chapter[]; removedId: string | null };
    if (removedId) dirtyChaptersRef.current.delete(removedId);
    setChapters((prev) => [...prev.filter((c) => c.id !== removedId), ...created]);
    const first = flattenChapterTree(buildChapterTree(created))[0];
    if (first && (removedId === activeChapterId || !activeChapterId)) setActiveChapterId(first.id);
    markEdited();
    notifyTree();
    return true;
  };

  const applyTemplate = async (template: OutlineTemplate): Promise<boolean> => {
    const ok = await appendChapters(template.beats);
    if (ok) setView("corkboard");
    return ok;
  };

  const importIntoBook = async (file: File) => {
    try {
      const book = await importDocx(file);
      const seeds = splitHtmlIntoChapters(book.html);
      const tree: NewChapterTree = seeds
        .map((seed, i) => ({ seed, i }))
        .filter(({ seed }) => seed.parentIndex === null)
        .map(({ seed, i }) => ({
          title: seed.title,
          content: seed.content,
          children: seeds.filter((c) => c.parentIndex === i).map((c) => ({ title: c.title, content: c.content })),
        }));
      if (bookIsEmpty && title === "Untitled") {
        setTitle(book.title);
      }
      const ok = await appendChapters(tree);
      if (!ok) throw new Error("Couldn't add the imported chapters. Please try again.");
      const count = tree.length;
      const notes = book.warnings.length ? `\n\n${book.warnings.join("\n")}` : "";
      alert(`Imported ${count} chapter${count === 1 ? "" : "s"} from ${file.name}.${notes}`);
    } catch (err) {
      alert((err as Error).message);
    }
  };

  const handleMoveChapter = (dragId: string, targetId: string, position: DropPosition) => {
    if (!doc) return;
    const result = moveChapter(chapters, dragId, targetId, position);
    if (!result || result.placements.length === 0) return;
    setChapters(result.chapters);
    void fetch(`/api/documents/${doc.id}/chapters/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ placements: result.placements }),
    }).then(notifyTree);
    markEdited();
  };

  const openRightPanel = (
    panel:
      | "chat"
      | "consistency"
      | "grammar"
      | "readability"
      | "thesaurus"
      | "illustrator"
      | "storyboard"
      | "elements"
      | "history"
      | "notes",
  ) => {
    setChatOpen(panel === "chat" ? (o) => !o : false);
    setConsistencyOpen(panel === "consistency" ? (o) => !o : false);
    setGrammarOpen(panel === "grammar" ? (o) => !o : false);
    setReadabilityOpen(panel === "readability" ? (o) => !o : false);
    setThesaurusOpen(panel === "thesaurus" ? (o) => !o : false);
    setIllustratorOpen(panel === "illustrator" ? (o) => !o : false);
    setStoryboardOpen(panel === "storyboard" ? (o) => !o : false);
    setElementsOpen(panel === "elements" ? (o) => !o : false);
    setRevisionsOpen(panel === "history" ? (o) => !o : false);
    setNotesOpen(panel === "notes" ? (o) => !o : false);
  };

  // Show a note (or the notes list, for null) in the right sidebar.
  const openNote = (noteId: string | null) => {
    openRightPanel("notes");
    setNotesOpen(true);
    setSelectedNoteId(noteId);
  };

  const createNote = async (kind: NoteKind) => {
    const note = await notesApi.create({ kind });
    if (note) openNote(note.id);
  };

  // ⌘⇧N: clip the selected text into a note linked to this chapter (or start
  // an empty note when nothing is selected).
  const quickNote = async () => {
    if (!canEditBook || !notesApi.ready) return;
    const text = editorSelection.trim();
    const note = await notesApi.create(
      text
        ? {
            kind: "note",
            title: text.length > 48 ? `${text.slice(0, 48).trim()}…` : text,
            content: `${text.split("\n").map((line) => `> ${line}`).join("\n")}\n\n`,
            chapterId: activeChapterId,
          }
        : { kind: "note", chapterId: activeChapterId },
    );
    if (note) openNote(note.id);
  };
  const quickNoteRef = useRef(quickNote);
  useEffect(() => { quickNoteRef.current = quickNote; });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        void quickNoteRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Show one story element's details in the right sidebar.
  const openElement = (elementId: string | null) => {
    openRightPanel("elements");
    setElementsOpen(true);
    setSelectedElementId(elementId);
  };

  const createElement = async (type: NewElementType) => {
    const el = await storyElements.create(type);
    if (el) openElement(el.id);
  };
  

  const anyRightPanelOpen =
    (chatOpen ||
      consistencyOpen ||
      readabilityOpen ||
      grammarOpen ||
      thesaurusOpen ||
      illustratorOpen ||
      storyboardOpen ||
      elementsOpen ||
      revisionsOpen ||
      notesOpen) &&
    !focusMode;

  if (loadError) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)", padding: "24px" }}>
        <div style={{ maxWidth: "460px", textAlign: "center", fontFamily: "var(--font-inter)" }}>
          <h1 style={{ fontFamily: "var(--font-dm-sans)", fontSize: "20px", color: "var(--text-primary)", margin: "0 0 8px" }}>This book couldn&apos;t be opened</h1>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: "0 0 6px" }}>{loadError}</p>
          <Link href="/dashboard" style={{ fontSize: "13px", color: "var(--gold-primary)" }}>Back to your manuscripts</Link>
        </div>
      </div>
    );
  }

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
              readOnly={!canEditBook}
              onChange={(e) => {
                setTitle(e.target.value);
                markEdited();
              }}
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

{canEditBook && (
<div style={{ position: "relative" }} data-cover-popover>
 <button
  onClick={() => {
    if (coverButtonRef.current) {
      const rect = coverButtonRef.current.getBoundingClientRect();
      setCoverButtonPos({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
    setCoverOpen((o) => !o);
  }}
  ref={coverButtonRef}
  style={{
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontFamily: "var(--font-inter)",
    color: "var(--text-muted)",
    background: "none",
    border: "none",
    cursor: "pointer",
    flexShrink: 0,
    transition: "color 0.15s",
    whiteSpace: "nowrap",        // ← prevents wrapping
    lineHeight: "1",             // ← keeps everything on one line
    padding: "0",
  }}
  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
  {coverImage ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coverImage}
      alt="Cover"
      style={{
        width: "14px",
        height: "20px",
        objectFit: "cover",
        border: "1px solid var(--border-color)",
        display: "inline-block",   // ← inline not block
        verticalAlign: "middle",   // ← aligns with text
        flexShrink: 0,
      }}
    />
  ) : (
    <ImagePlus style={{ width: "14px", height: "14px", flexShrink: 0 }} />
  )}
  <span>Cover</span>
</button>
</div>
)}

{/* Portal dropdown — renders on document.body */}
{coverOpen && doc && typeof window !== "undefined" && createPortal(
  <div
    style={{
      position: "fixed",
      top: coverButtonPos.top,
      right: coverButtonPos.right,
      background: "var(--bg-surface)",
      border: "1px solid var(--border-color)",
      padding: "16px",
      zIndex: 9999,
      boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
      minWidth: "160px",
    }}>
    <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "12px" }}>
      Book Cover
    </p>
    {CoverUpload && (
      <CoverUpload
        documentId={doc.id}
        currentCover={coverImage}
        onUpdate={(url) => {
          setCoverImage(url);
          setCoverOpen(false);
        }}
      />
    )}
  </div>,
  document.body
)}

            {doc && (
              <div style={{ display: "flex", border: "1px solid var(--border-color)", flexShrink: 0 }}>
                {([["write", PenLine, "Write"], ["corkboard", StickyNote, "Corkboard"]] as const).map(([v, Icon, label]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    style={{
                      display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px",
                      fontSize: "12px", fontFamily: "var(--font-inter)", border: "none", cursor: "pointer",
                      background: view === v ? "var(--gold-subtle)" : "transparent",
                      color: view === v ? "var(--gold-primary)" : "var(--text-muted)",
                    }}>
                    <Icon style={{ width: "12px", height: "12px" }} />
                    {label}
                  </button>
                ))}
              </div>
            )}

            {doc && canEditBook && (
              <button
                onClick={() => setTemplatesOpen(true)}
                title="Outline templates"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                <LayoutList style={{ width: "13px", height: "13px" }} />
                <span>Templates</span>
              </button>
            )}

            {peers.length > 0 && (
              <div style={{ display: "flex", flexShrink: 0 }} aria-label="Also here">
                {peers.slice(0, 4).map((p, i) => (
                  <span
                    key={p.id}
                    title={`${p.name}${p.chapterId ? ` · ${chapters.find((c) => c.id === p.chapterId)?.title ?? ""}` : ""}`}
                    style={{
                      width: "24px", height: "24px", borderRadius: "50%", background: p.color, color: "#fff",
                      display: "flex", alignItems: "center", justifyContent: "center", marginLeft: i ? "-6px" : 0,
                      fontSize: "11px", fontWeight: 700, fontFamily: "var(--font-inter)",
                      border: "2px solid var(--bg-surface)", cursor: "default",
                    }}>
                    {p.name.charAt(0).toUpperCase()}
                  </span>
                ))}
                {peers.length > 4 && (
                  <span style={{ marginLeft: "4px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", alignSelf: "center" }}>+{peers.length - 4}</span>
                )}
              </div>
            )}

            {doc && isOwner && (
              <button
                onClick={() => setShareOpen(true)}
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0 }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                <Share2 style={{ width: "13px", height: "13px" }} />
                <span>Share</span>
              </button>
            )}

            {ExportMenu && (
              <ExportMenu
                title={title}
                content={manuscript}
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
     <div style={{
  display: "flex",
  flex: 1,
  minHeight: 0,
  height: "100%",        // ← add this
  overflow: "hidden",    // ← add this back
  position: "relative",
}}>
        {!focusMode && doc && (
          <ChapterSidebar
            documentId={doc.id}
            chapters={chapters}
            activeChapterId={activeChapterId}
            collapsed={sidebarCollapsed}
            onToggleCollapsed={() => setSidebarCollapsed((c) => !c)}
            onSelect={selectChapter}
            onAdd={(parentId) => void addChapter(parentId)}
            onRename={renameChapter}
            onDelete={(chapterId) => void deleteChapter(chapterId)}
            onMove={handleMoveChapter}
            elements={storyElements.elements}
            onOpenElement={openElement}
            onCreateElement={(type) => void createElement(type)}
            onImport={importIntoBook}
            canEditStructure={canEditBook}
            peers={peers}
            notes={notesApi.notes}
            onOpenNote={openNote}
            onCreateNote={(kind) => void createNote(kind)}
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
          {view === "corkboard" && !focusMode && (
            <Corkboard
              chapters={chapters}
              activeChapterId={activeChapterId}
              onOpen={(chapterId) => {
                selectChapter(chapterId);
                setView("write");
              }}
              onRename={renameChapter}
              onSynopsisChange={(chapterId, synopsis) => patchChapter(chapterId, { synopsis })}
              onMove={handleMoveChapter}
              onAdd={(parentId) => void addChapter(parentId)}
              onOpenTemplates={() => setTemplatesOpen(true)}
              canEditStructure={canEditBook}
            />
          )}
          {view === "write" && !focusMode && activeChapter?.guidance && (
            <GuidanceBanner
              key={activeChapter.id}
              title={activeChapter.title}
              guidance={activeChapter.guidance}
              onDismiss={() => patchChapter(activeChapter.id, { guidance: "" })}
            />
          )}
          {(view === "write" || focusMode) && activeChapter && me && (
            <WritingEditor
              key={`${activeChapter.id}-${editorEpoch}`}
              collab={{ chapterId: activeChapter.id, user: me }}
              content={activeChapter.content}
              onChange={handleContentChange}
              editorStyle={editorStyle}
              onEditorReady={setEditor}
              genre={genre}
              bibleContext={bibleContext}
              focusMode={focusMode}
              storyElements={storyElements.elements}
              onOpenElement={openElement}
              smartText={prefs.smartText}
              onToggleSmartText={() => updatePrefs({ smartText: !prefs.smartText })}
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
                icon={Users}
                label="Story Elements"
                active={elementsOpen}
                onClick={() => openRightPanel("elements")}
              />
              <ActionButton
                icon={NotebookPen}
                label="Notes & Research (⌘⇧N)"
                active={notesOpen}
                onClick={() => openRightPanel("notes")}
              />
              {isOwner && (
                <ActionButton
                  icon={History}
                  label="Revision History"
                  active={revisionsOpen}
                  onClick={() => openRightPanel("history")}
                />
              )}
              <ActionButton
                icon={MessageSquare}
                label="AI Assistant"
                active={chatOpen}
                onClick={() => openRightPanel("chat")}
              />
              <ActionButton
                icon={LayoutTemplate}
                label="Storyboard"
                active={storyboardOpen}
                onClick={() => openRightPanel("storyboard")}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right panels */}
        {ChatPanel && (
  <ChatPanel
    documentContent={content}
    documentId={doc?.id}
    genre={genre}
    bibleContext={bibleContext}
    isOpen={chatOpen}
    onToggle={() => openRightPanel("chat")}
    selectedText={chatSelectedText}
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
       
{doc && (
  <RevisionPanel
    documentId={doc.id}
    isOpen={revisionsOpen}
    onClose={() => setRevisionsOpen(false)}
    refreshKey={revisionTick}
    flushSave={saveDocument}
    onRestored={async () => {
      await reloadAfterRestore();
      notify("reload");
    }}
  />
)}
{doc && (
  <NotesPanel
    api={notesApi}
    chapters={chapters}
    activeChapterId={activeChapterId}
    selectedId={selectedNoteId}
    onSelect={setSelectedNoteId}
    selectionText={editorSelection}
    onGoToChapter={(chapterId) => {
      selectChapter(chapterId);
      setView("write");
    }}
    isOpen={notesOpen}
    onClose={() => setNotesOpen(false)}
    readOnly={!canEditBook}
  />
)}
{doc && (
  <StoryElementPanel
    readOnly={!canEditBook}
    api={storyElements}
    documentId={doc.id}
    selectedId={selectedElementId}
    onSelect={setSelectedElementId}
    isOpen={elementsOpen}
    onClose={() => setElementsOpen(false)}
  />
)}
{doc && StoryboardPanel && (
  <StoryboardPanel
    documentId={doc.id}
    isOpen={storyboardOpen}
    onClose={() => setStoryboardOpen(false)}
  />
)}
      </div>

      {shareOpen && doc && (
        <ShareDialog documentId={doc.id} chapters={chapters} onClose={() => setShareOpen(false)} />
      )}

      {templatesOpen && (
        <TemplateGallery
          onClose={() => setTemplatesOpen(false)}
          onApply={applyTemplate}
          bookIsEmpty={bookIsEmpty}
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
