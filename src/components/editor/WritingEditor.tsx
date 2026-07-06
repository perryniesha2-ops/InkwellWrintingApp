import { useEditor, EditorContent } from "@tiptap/react";
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
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { Editor } from "@tiptap/react";
import InlineAIToolbar from "@/components/editor/InlineAIToolbar";

interface EditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  editorStyle?: CSSProperties;
  onEditorReady?: (editor: Editor) => void;
  genre?: string;
  bibleContext?: string;
  focusMode?: boolean;
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
  genre,
  bibleContext,
  focusMode,
}: EditorProps) {
  const editorContainerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Typography,
      Underline,
      CharacterCount,
      Placeholder.configure({
        placeholder: placeholder ?? "Begin your story here…",
      }),
    ],
    content,
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "editor-prose outline-none min-h-[60vh] focus:outline-none",
        spellcheck: "false",
      },
    },
  });

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      onEditorReady?.(editor);
    }
  }, [editor, onEditorReady]);

  const handleReplace = useCallback(
    (newText: string) => {
      if (!editor) return;
      const { from, to } = editor.state.selection;
      editor
        .chain()
        .focus()
        .deleteRange({ from, to })
        .insertContentAt(from, newText)
        .run();
    },
    [editor],
  );

  const handleInsertAfter = useCallback(
    (text: string) => {
      if (!editor) return;
      const { to } = editor.state.selection;
      editor.chain().focus().insertContentAt(to, text).run();
    },
    [editor],
  );

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
      {/* ── Inline AI toolbar ── */}
      <InlineAIToolbar
        editorEl={editorContainerRef}
        onReplace={handleReplace}
        onInsertAfter={handleInsertAfter}
        genre={genre}
        bibleContext={bibleContext}
      />
    </motion.div>
  );
}
