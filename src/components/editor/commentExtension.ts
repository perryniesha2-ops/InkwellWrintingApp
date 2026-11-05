import { Mark, mergeAttributes, type Editor } from "@tiptap/core";
import { Plugin, PluginKey, TextSelection } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import { sentenceAt } from "@/lib/comments";

export interface CommentOptions {
  /** Called when the writer clicks commented text. */
  onCommentClick: (commentId: string) => void;
  /** Called after a double-click selected a sentence to comment on. */
  onRequestComment: () => void;
  /** Only comments that still exist (and aren't resolved) react to clicks. */
  isActiveComment: (commentId: string) => boolean;
  /**
   * True in proofread mode. Otherwise the editor behaves normally: double-click
   * selects a word, commented text isn't clickable and ⌘⌥M does nothing.
   */
  isEnabled: () => boolean;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (commentId: string) => ReturnType;
      unsetComment: (commentId: string) => ReturnType;
      /** Highlight the text a comment is being written for (null clears it). */
      setPendingComment: (range: { from: number; to: number } | null) => ReturnType;
    };
  }
}

type Range = { from: number; to: number };

/**
 * The text a new comment is being written for. Highlighted with a decoration
 * (not a mark) and remapped through edits, since the selection itself stops
 * showing once focus moves to the comment box.
 */
const pendingCommentKey = new PluginKey<Range | null>("commentPending");

/** The pending comment's range, remapped through any edits since it was set. */
export const getPendingComment = (editor: Editor): Range | null =>
  pendingCommentKey.getState(editor.state) ?? null;

/** The comment ids under a document position (innermost first). */
function commentIdsAt(view: EditorView, pos: number): string[] {
  const $pos = view.state.doc.resolve(pos);
  const marks = [...$pos.marks(), ...($pos.nodeAfter?.marks ?? [])];
  return [...new Set(marks.filter((m) => m.type.name === "comment").map((m) => m.attrs.commentId as string))];
}

/**
 * Marks commented text with `<span data-comment-id>`. Several comments may
 * overlap. Highlighting is done by EditorPage with CSS scoped to the live
 * editor, so saved chapter HTML, exports and share links show plain text.
 */
export const Comment = Mark.create<CommentOptions>({
  name: "comment",
  inclusive: false,
  excludes: "",

  addOptions() {
    return {
      onCommentClick: () => {},
      onRequestComment: () => {},
      isActiveComment: () => false,
      isEnabled: () => true,
    };
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-comment-id"),
        renderHTML: (attrs) => ({ "data-comment-id": attrs.commentId as string }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setComment: (commentId) => ({ commands }) => commands.setMark(this.name, { commentId }),
      unsetComment: (commentId) => ({ tr, state, dispatch }) => {
        const type = state.schema.marks.comment;
        let found = false;
        state.doc.descendants((node, pos) => {
          node.marks.forEach((m) => {
            if (m.type === type && m.attrs.commentId === commentId) {
              tr.removeMark(pos, pos + node.nodeSize, m);
              found = true;
            }
          });
        });
        if (found && dispatch) dispatch(tr);
        return found;
      },
      setPendingComment: (range) => ({ tr, dispatch }) => {
        if (dispatch) tr.setMeta(pendingCommentKey, range).setMeta("addToHistory", false);
        return true;
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Alt-m": () => {
        if (!this.options.isEnabled()) return false;
        if (this.editor.state.selection.empty) selectSentenceAt(this.editor.view, this.editor.state.selection.from);
        if (this.editor.state.selection.empty) return false;
        this.options.onRequestComment();
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<Range | null>({
        key: pendingCommentKey,
        state: {
          init: () => null,
          apply(tr, range) {
            const meta = tr.getMeta(pendingCommentKey) as Range | null | undefined;
            if (meta !== undefined) return meta;
            if (!range || !tr.docChanged) return range;
            const from = tr.mapping.map(range.from, 1);
            const to = tr.mapping.map(range.to, -1);
            return from < to ? { from, to } : null;
          },
        },
        props: {
          decorations(state) {
            const range = pendingCommentKey.getState(state);
            if (!range) return null;
            return DecorationSet.create(state.doc, [
              Decoration.inline(range.from, range.to, {
                class: "comment-pending",
                style: "background: rgba(234,179,8,0.35); border-bottom: 2px solid rgba(234,179,8,0.85);",
              }),
            ]);
          },
        },
      }),
      new Plugin({
        key: new PluginKey("comment"),
        props: {
          handleClick: (view, pos) => {
            if (!options.isEnabled()) return false;
            const id = commentIdsAt(view, pos).find((c) => options.isActiveComment(c));
            if (id) options.onCommentClick(id);
            return false;
          },
          // Double-click selects the whole sentence (instead of one word) and
          // opens the comment box; double-clicking existing commented text
          // opens that comment instead.
          handleDoubleClick: (view, pos) => {
            if (!options.isEnabled()) return false;
            const existing = commentIdsAt(view, pos).find((c) => options.isActiveComment(c));
            if (existing) {
              options.onCommentClick(existing);
              return false;
            }
            if (!selectSentenceAt(view, pos)) return false;
            // Open the box once this click has finished. Opening it during the
            // mousedown moved focus mid-click, and the box's "click outside to
            // close" handler caught this same click, so it closed at once and
            // the cursor jumped elsewhere.
            setTimeout(() => options.onRequestComment(), 0);
            return true;
          },
        },
      }),
    ];
  },
});

/** Select the sentence around `pos` in its paragraph. Returns false if there's none. */
export function selectSentenceAt(view: EditorView, pos: number): boolean {
  const $pos = view.state.doc.resolve(pos);
  const parent = $pos.parent;
  if (!parent.isTextblock) return false;
  // One character per inline leaf (e.g. hard breaks), so string offsets match positions.
  const text = parent.textBetween(0, parent.content.size, undefined, "￼");
  const range = sentenceAt(text, $pos.parentOffset);
  if (!range) return false;
  const start = $pos.start();
  view.dispatch(view.state.tr.setSelection(TextSelection.create(view.state.doc, start + range[0], start + range[1])));
  return true;
}

/** Document range covered by a comment, or null if its text was deleted. */
export function findCommentRange(editor: Editor, commentId: string): { from: number; to: number } | null {
  let from = -1;
  let to = -1;
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText) return;
    if (node.marks.some((m) => m.type.name === "comment" && m.attrs.commentId === commentId)) {
      if (from < 0) from = pos;
      to = pos + node.nodeSize;
    }
  });
  return from < 0 ? null : { from, to };
}

/** Comment ids present in the editor's document. */
export function commentIdsInDoc(editor: Editor): Set<string> {
  const ids = new Set<string>();
  editor.state.doc.descendants((node) => {
    node.marks.forEach((m) => { if (m.type.name === "comment") ids.add(m.attrs.commentId as string); });
  });
  return ids;
}

/** Select a comment's text and scroll it into view. Returns false if it's gone. */
export function focusComment(editor: Editor, commentId: string): boolean {
  const range = findCommentRange(editor, commentId);
  if (!range) return false;
  editor.chain().setTextSelection(range).scrollIntoView().run();
  const dom = editor.view.domAtPos(range.from).node;
  (dom instanceof HTMLElement ? dom : dom.parentElement)?.scrollIntoView({ block: "center", behavior: "smooth" });
  return true;
}
