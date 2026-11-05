import { useEditor, EditorContent } from "@tiptap/react";
import Collaboration, { isChangeOrigin } from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Typography from "@tiptap/extension-typography";
import CharacterCount from "@tiptap/extension-character-count";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Minus,
  Sparkles,
  MessageSquarePlus,
  PenLine,
  SpellCheck,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/react";
import { fixHtmlParagraphs, plainTextToHtml } from "@/lib/formatParagraphs";
import TextAlign from "@tiptap/extension-text-align";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { SmartText, SMART_TEXT_REFRESH, type SmartSuggestionState } from "@/components/editor/smartTextExtension";
import SmartTextLayer from "@/components/editor/SmartTextLayer";
import { buildTerms } from "@/lib/smartText";
import type { StoryElement } from "@/lib/storyElements";
import { useChapterCollab } from "@/hooks/useChapterCollab";
import { Comment, getPendingComment, selectSentenceAt } from "@/components/editor/commentExtension";
import CommentComposer, { CommentChip } from "@/components/editor/CommentComposer";
import type { CollabUser } from "@/lib/collab/identity";

interface EditorProps {
  content: string;
  /** `remote` is true when the change came from a collaborator. */
  onChange: (content: string, remote: boolean) => void;
  /**
   * Live collaboration for this chapter. `content` is then only used to seed
   * the shared document the first time the chapter is opened.
   */
  collab?: { chapterId: string; user: CollabUser };
  placeholder?: string;
  editorStyle?: CSSProperties;
  onEditorReady?: (editor: Editor) => void;
  focusMode?: boolean;
  storyElements?: StoryElement[];
  onOpenElement?: (id: string) => void;
  smartText?: boolean;
  onToggleSmartText?: () => void;
  /** Proofreading comments; pass only in proofread mode (omit for normal editing). */
  comments?: EditorComments;
  /** Shows the Edit / Proofread switch in the toolbar. */
  proofreading?: boolean;
  onProofreadingChange?: (on: boolean) => void;
}

export interface EditorComments {
  /** True for comments that exist and are open (only those are clickable). */
  isActive: (commentId: string) => boolean;
  onClick: (commentId: string) => void;
  /** Save a comment whose text is already marked. Resolves to an error message or null. */
  onCreate: (input: { id: string; quote: string; body: string }) => Promise<string | null>;
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={title}
      className="p-1.5 transition-colors"
      style={
        active
          ? { background: "var(--gold-subtle)", color: "var(--gold-primary)" }
          : { color: "var(--text-muted)" }
      }
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background =
            "var(--bg-elevated)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      className="w-px h-4 mx-1"
      style={{ background: "var(--border-color)" }}
    />
  );
}

export default function WritingEditor({
  content,
  onChange,
  placeholder,
  editorStyle = {},
  onEditorReady,
  focusMode,
  storyElements = [],
  onOpenElement,
  smartText = true,
  onToggleSmartText,
  collab,
  comments,
  proofreading = false,
  onProofreadingChange,
}: EditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const { session, status, error: collabError } = useChapterCollab(collab?.chapterId ?? null);
  const [suggestion, setSuggestion] = useState<SmartSuggestionState | null>(null);
  // The editor is created once per chapter; Smart Text reads these refs live.
  const terms = useMemo(() => buildTerms(storyElements), [storyElements]);
  const termsRef = useRef(terms);
  const smartTextRef = useRef(smartText);
  const commentsRef = useRef(comments);
  useEffect(() => { commentsRef.current = comments; }, [comments]);
  const [composer, setComposer] = useState<{ from: number; to: number; quote: string } | null>(null);
  const [chip, setChip] = useState<number | null>(null);
  const openComposerRef = useRef<() => void>(() => {});

  const editor = useEditor({
  extensions: [
    // Collaboration brings its own (shared-history-aware) undo/redo.
    StarterKit.configure(collab ? { undoRedo: false } : {}),
    ...(session
      ? [
          Collaboration.configure({ document: session.doc }),
          CollaborationCaret.configure({ provider: session.provider, user: collab!.user }),
        ]
      : []),
    Typography,
    Underline,
    CharacterCount,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      defaultAlignment: "left",
    }),
  
    Placeholder.configure({
      placeholder: placeholder ?? "Begin your story here…",
    }),
    // The getters run inside ProseMirror plugin callbacks, never during render.
    // eslint-disable-next-line react-hooks/refs
    SmartText.configure({
      getTerms: () => termsRef.current,
      isEnabled: () => smartTextRef.current,
      onSuggestionChange: setSuggestion,
    }),
    // eslint-disable-next-line react-hooks/refs
    Comment.configure({
      onCommentClick: (id) => commentsRef.current?.onClick(id),
      onRequestComment: () => openComposerRef.current(),
      isActiveComment: (id) => commentsRef.current?.isActive(id) ?? false,
      isEnabled: () => !!commentsRef.current,
    }),
  ],
    // With collaboration the content comes from the shared doc (seeded below).
    content: collab ? undefined : content,
    onUpdate({ editor, transaction }) {
      onChange(editor.getHTML(), isChangeOrigin(transaction));
    },
    editorProps: {
      attributes: {
        class: "editor-prose outline-none min-h-[60vh] focus:outline-none",
        spellcheck: "false",
      },
    },
    // In collaborative mode, wait for the shared doc before creating the editor.
  }, [session]);

  // First open of a chapter with live editing: fill the shared doc from the
  // chapter's saved HTML. Only the browser that wins the claim seeds it, so two
  // people opening a chapter at once can't duplicate its text.
  useEffect(() => {
    if (!editor || !session || !collab) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const isEmpty = () => session.doc.getXmlFragment("default").length === 0;
    const seed = () => {
      if (!cancelled && !editor.isDestroyed && isEmpty()) editor.commands.setContent(content);
    };
    void session.provider.synced.then(async ({ seeded }) => {
      if (cancelled || !isEmpty() || !content.replace(/<[^>]+>/g, "").trim()) return;
      if (!seeded) {
        if (await session.provider.claimSeed()) seed();
      } else {
        // Someone claimed it but their text hasn't arrived; don't leave the
        // chapter blank if they never finished.
        timer = setTimeout(seed, 4000);
      }
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Seed once per editor; `content` is the snapshot taken when it opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, session]);

 const handleFixParagraphs = useCallback(() => {
  if (!editor) return;

  const { from, to } = editor.state.selection;
  const hasSelection = from !== to;

  if (hasSelection) {
    // Fix just the selected text — no headings in selections typically
    const selectedText = editor.state.doc.textBetween(from, to, "\n");
    const fixed = plainTextToHtml(selectedText);
    editor
      .chain()
      .focus()
      .deleteRange({ from, to })
      .insertContentAt(from, fixed)
      .run();
  } else {
    // Fix entire document — preserves headings
    const currentHtml = editor.getHTML();
    const fixed = fixHtmlParagraphs(currentHtml);
   editor.commands.setContent(fixed);
  }
}, [editor, onChange]);


  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      onEditorReady?.(editor);
    }
  }, [editor, onEditorReady]);

  // Re-scan for element names when elements are renamed/added or Smart Text is toggled.
  useEffect(() => {
    termsRef.current = terms;
    smartTextRef.current = smartText;
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(editor.state.tr.setMeta(SMART_TEXT_REFRESH, true));
    }
  }, [editor, terms, smartText]);

  // Comment box for the current selection (or the sentence at the cursor).
  const openComposer = () => {
    if (!editor || !commentsRef.current) return;
    if (editor.state.selection.empty) selectSentenceAt(editor.view, editor.state.selection.from);
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    setChip(null);
    editor.commands.setPendingComment({ from, to });
    setComposer({ from, to, quote: editor.state.doc.textBetween(from, to, " ").trim() });
  };

  const closeComposer = (refocus: boolean) => {
    setComposer(null);
    if (!editor || editor.isDestroyed) return;
    editor.commands.setPendingComment(null);
    if (refocus) editor.commands.focus();
  };
  useEffect(() => { openComposerRef.current = openComposer; });

  // Offer a "Comment" button next to a selected passage.
  useEffect(() => {
    if (!editor || !comments) return;
    const update = () => {
      const { empty, to } = editor.state.selection;
      setChip(!empty && editor.isFocused ? to : null);
    };
    const hide = () => setChip(null);
    editor.on("selectionUpdate", update);
    editor.on("focus", update);
    editor.on("blur", hide);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("focus", update);
      editor.off("blur", hide);
    };
  }, [editor, comments]);

  const submitComment = async (body: string): Promise<string | null> => {
    if (!editor || !composer || !commentsRef.current) return "Not ready.";
    // The highlighted range is remapped through edits made while typing
    // (including collaborators'); fall back to the original range.
    const range = getPendingComment(editor) ?? composer;
    const id = crypto.randomUUID();
    editor.chain().setTextSelection(range).setComment(id).setTextSelection(range.to).run();
    const err = await commentsRef.current.onCreate({ id, quote: composer.quote, body });
    if (err) {
      editor.commands.unsetComment(id);
      return err;
    }
    closeComposer(false);
    return null;
  };

  if (collab && (!session || !editor)) {
    return (
      <div className="flex flex-1 items-center justify-center" style={{ color: collabError ? "#ef4444" : "var(--text-dim)", fontFamily: "var(--font-inter)", fontSize: "13px", padding: "2rem", textAlign: "center" }}>
        {collabError ?? "Loading chapter…"}
      </div>
    );
  }
  if (!editor) return null;

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col flex-1 min-h-0"
      style={{ background: "var(--bg-primary)" }}
    >
      {/* ── Toolbar ── */}
      <AnimatePresence>
        {!focusMode && (
          <motion.div
            initial={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-0.5 px-3 flex-shrink-0 overflow-hidden"
            style={{
              height: "40px",
              borderBottom: "1px solid var(--border-color)",
              background: "var(--bg-surface)",
            }}
          >
            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              title="Undo"
            >
              <Undo className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              title="Redo"
            >
              <Redo className="w-3.5 h-3.5" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              active={editor.isActive("bold")}
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              active={editor.isActive("italic")}
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              active={editor.isActive("underline")}
              title="Underline"
            >
              <UnderlineIcon className="w-3.5 h-3.5" />
            </ToolbarButton>

            <Divider />

<ToolbarButton
  onClick={() => editor.chain().focus().setTextAlign("left").run()}
  active={editor.isActive({ textAlign: "left" })}
  title="Align Left">
  <AlignLeft style={{ width: "14px", height: "14px" }} />
</ToolbarButton>

<ToolbarButton
  onClick={() => editor.chain().focus().setTextAlign("center").run()}
  active={editor.isActive({ textAlign: "center" })}
  title="Center">
  <AlignCenter style={{ width: "14px", height: "14px" }} />
</ToolbarButton>

<ToolbarButton
  onClick={() => editor.chain().focus().setTextAlign("right").run()}
  active={editor.isActive({ textAlign: "right" })}
  title="Align Right">
  <AlignRight style={{ width: "14px", height: "14px" }} />
</ToolbarButton>

            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 1 }).run()
              }
              active={editor.isActive("heading", { level: 1 })}
              title="Heading 1"
            >
              <Heading1 className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() =>
                editor.chain().focus().toggleHeading({ level: 2 }).run()
              }
              active={editor.isActive("heading", { level: 2 })}
              title="Heading 2"
            >
              <Heading2 className="w-3.5 h-3.5" />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              active={editor.isActive("bulletList")}
              title="Bullet list"
            >
              <List className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              active={editor.isActive("orderedList")}
              title="Numbered list"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              active={editor.isActive("blockquote")}
              title="Quote"
            >
              <Quote className="w-3.5 h-3.5" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              title="Horizontal rule"
            >
              <Minus className="w-3.5 h-3.5" />
            </ToolbarButton>
            <Divider />
<div style={{ position: "relative" }} className="group">
  <ToolbarButton
    onClick={handleFixParagraphs}
    title="Fix Paragraphs — select text to fix a section, or click to fix entire chapter">
    <AlignLeft style={{ width: "14px", height: "14px" }} />
  </ToolbarButton>
  {/* Tooltip */}
  <div style={{
    position: "absolute", bottom: "calc(100% + 6px)", left: "50%",
    transform: "translateX(-50%)",
    background: "var(--bg-elevated)", border: "1px solid var(--border-color)",
    color: "var(--text-primary)", fontSize: "11px", fontFamily: "var(--font-inter)",
    padding: "4px 8px", whiteSpace: "nowrap", pointerEvents: "none",
    transition: "opacity 0.15s", zIndex: 50,
  }}
    className="opacity-0 group-hover:opacity-100">
    Fix Paragraphs
  </div>
</div>
            

            {onProofreadingChange && (
              <div
                role="radiogroup"
                aria-label="Editing mode"
                className="flex items-center flex-shrink-0"
                style={{ marginLeft: "6px", marginRight: "4px", border: "1px solid var(--border-color)" }}>
                {([
                  [false, "Edit", PenLine, "Edit mode: write and revise normally"],
                  [true, "Proofread", SpellCheck, "Proofread mode: double-click a sentence or select a passage to leave a comment"],
                ] as const).map(([on, label, Icon, title]) => {
                  const selected = proofreading === on;
                  return (
                    <button
                      key={label}
                      role="radio"
                      aria-checked={selected}
                      aria-label={label}
                      title={title}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        if (selected) return;
                        if (composer) closeComposer(false);
                        setChip(null);
                        onProofreadingChange(on);
                      }}
                      className="flex items-center gap-1 transition-colors"
                      style={{
                        padding: "3px 8px", fontSize: "11.5px", fontFamily: "var(--font-inter)", cursor: selected ? "default" : "pointer", border: "none",
                        background: selected ? "var(--gold-subtle)" : "transparent",
                        color: selected ? "var(--gold-primary)" : "var(--text-muted)",
                      }}>
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden lg:inline">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}

            {comments && (
              <ToolbarButton onClick={openComposer} title="Add comment (⌘⌥M) — or double-click a sentence">
                <MessageSquarePlus className="w-3.5 h-3.5" />
              </ToolbarButton>
            )}

            {onToggleSmartText && (
              <ToolbarButton
                onClick={onToggleSmartText}
                active={smartText}
                title={smartText ? "Smart Text on: story elements are suggested and linked as you type" : "Smart Text off"}>
                <Sparkles className="w-3.5 h-3.5" />
              </ToolbarButton>
            )}

            {collab && (
              <span
                title={status === "online"
                  ? "Live: changes save as you type and collaborators see them instantly"
                  : status === "offline"
                    ? "Offline: keep writing; changes are kept and saved when the connection returns"
                    : "Connecting…"}
                style={{ display: "flex", alignItems: "center", gap: "5px", marginLeft: "8px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: status === "online" ? "#5bb98c" : status === "offline" ? "#e07b4f" : "var(--text-dim)" }} />
                {status === "online" ? "Live" : status === "offline" ? "Offline" : "Connecting"}
              </span>
            )}

            {/* Word count */}
            <div
              className="ml-auto flex items-center gap-3"
              style={{
                fontSize: "11px",
                fontFamily: "Inter",
                color: "var(--text-dim)",
              }}
            >
              <span>{wordCount.toLocaleString()} words</span>
              <span>{charCount.toLocaleString()} chars</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor content */}
      <div
        id="editor-scroll-container"
        className="flex-1 overflow-y-auto"
        style={
          focusMode
            ? {
                paddingLeft: "calc(50vw - 340px)",
                paddingRight: "calc(50vw - 340px)",
                paddingTop: "5rem",
                paddingBottom: "5rem",
              }
            : {
                padding: "4rem 4rem", // ← was 3rem 2rem
              }
        }
      >
        <div style={{ maxWidth: "660px", margin: "0 auto" }}>
          <div
            ref={editorContainerRef}
            spellCheck={false}
            style={
              {
                ...editorStyle,
                // Override the CSS class with inline styles
                "--editor-font-family": editorStyle.fontFamily,
                "--editor-font-size": editorStyle.fontSize,
                "--editor-line-height": editorStyle.lineHeight,
              } as CSSProperties
            }
          >
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>
      {comments && composer && (
        <CommentComposer
          editor={editor}
          pos={composer.to}
          quote={composer.quote}
          onSubmit={submitComment}
          onCancel={() => closeComposer(true)}
        />
      )}
      {comments && !composer && chip !== null && (
        <CommentChip editor={editor} pos={chip} onClick={openComposer} />
      )}
      <SmartTextLayer
        suggestion={smartText ? suggestion : null}
        elements={storyElements}
        containerRef={editorContainerRef}
        onOpenElement={onOpenElement}
      />
    </motion.div>
  );
}
