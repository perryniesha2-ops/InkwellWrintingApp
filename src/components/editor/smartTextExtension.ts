import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type EditorState } from "@tiptap/pm/state";
import { Decoration, DecorationSet, type EditorView } from "@tiptap/pm/view";
import type { Node as PMNode } from "@tiptap/pm/model";
import {
  buildMatcher, findTermMatches, suggestTerms,
  type SmartTerm, type TermSuggestion,
} from "@/lib/smartText";

export interface SmartSuggestionState {
  items: TermSuggestion[];
  index: number;
  /** Viewport coordinates of the cursor, for positioning the popup. */
  rect: { left: number; top: number; bottom: number };
  accept: (index: number) => void;
}

export interface SmartTextOptions {
  getTerms: () => SmartTerm[];
  isEnabled: () => boolean;
  onSuggestionChange: (state: SmartSuggestionState | null) => void;
}

/** Dispatch a transaction with this meta set to re-scan after terms change. */
export const SMART_TEXT_REFRESH = "smartTextRefresh";
const linksKey = new PluginKey<DecorationSet>("smartTextLinks");
const TRAILING_WORD = /[\p{L}][\p{L}\p{M}'’-]*$/u;
const trailingWordLength = (text: string) => TRAILING_WORD.exec(text)?.[0].length ?? 0;

/** Text of the cursor's paragraph before the cursor (last 80 chars). */
function textBeforeCursor(state: EditorState): string {
  const $pos = state.selection.$from;
  return $pos.parent.textBetween(Math.max(0, $pos.parentOffset - 80), $pos.parentOffset, "", "￼");
}
const suggestKey = new PluginKey("smartTextSuggest");

function linkDecorations(doc: PMNode, terms: SmartTerm[]): DecorationSet {
  const matcher = buildMatcher(terms);
  if (!matcher) return DecorationSet.empty;
  const idByText = new Map(terms.map((t) => [t.text, t.elementId]));
  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    for (const m of findTermMatches(node.text, matcher, idByText)) {
      decorations.push(
        Decoration.inline(pos + m.from, pos + m.to, {
          class: "smart-link",
          "data-element-id": m.elementId,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

/**
 * Smart Text: underlines every mention of a story element (rendered as
 * decorations, so nothing is stored in the manuscript and renames apply
 * instantly) and suggests element names as you type.
 */
export const SmartText = Extension.create<SmartTextOptions>({
  name: "smartText",
  // Run before the default keymaps so Enter/Tab accept a suggestion instead
  // of splitting the paragraph or indenting a list.
  priority: 1000,

  addOptions() {
    return {
      getTerms: () => [],
      isEnabled: () => true,
      onSuggestionChange: () => {},
    };
  },

  addProseMirrorPlugins() {
    const { getTerms, isEnabled, onSuggestionChange } = this.options;
    const scan = (state: EditorState) =>
      isEnabled() ? linkDecorations(state.doc, getTerms()) : DecorationSet.empty;

    // Suggestion popup state, owned by the plugin and mirrored to React.
    let active: { items: TermSuggestion[]; index: number; cursor: number } | null = null;
    // Word start the user dismissed (Esc) or just completed; don't re-open there.
    let suppressedAt: number | null = null;
    let viewRef: EditorView | null = null;

    const publish = () => {
      if (!active || !viewRef) return onSuggestionChange(null);
      const { left, top, bottom } = viewRef.coordsAtPos(active.cursor);
      onSuggestionChange({ items: active.items, index: active.index, rect: { left, top, bottom }, accept });
    };

    const close = () => {
      if (!active) return;
      active = null;
      publish();
    };

    const accept = (index: number) => {
      const view = viewRef;
      const item = active?.items[index];
      if (!view || !active || !item) return;
      const from = active.cursor - item.replaceLength;
      // Don't immediately re-suggest on the name just inserted.
      suppressedAt = from + item.term.text.length - trailingWordLength(item.term.text);
      active = null;
      view.dispatch(view.state.tr.insertText(item.term.text, from, view.state.selection.from));
      view.focus();
      publish();
    };

    const refresh = (view: EditorView) => {
      const { selection } = view.state;
      const $pos = selection.$from;
      if (!isEnabled() || !selection.empty || view.composing || !$pos.parent.isTextblock) return close();
      const offset = $pos.parentOffset;
      const nextChar = $pos.parent.textBetween(offset, Math.min(offset + 1, $pos.parent.content.size), "", "￼");
      if (/[\p{L}\p{N}]/u.test(nextChar)) return close();
      const before = textBeforeCursor(view.state);
      const items = suggestTerms(before, getTerms());
      const wordStart = selection.from - trailingWordLength(before);
      if (suppressedAt !== null && suppressedAt !== wordStart) suppressedAt = null;
      if (!items.length || suppressedAt === wordStart) return close();
      const sameList = active && active.items.length === items.length &&
        active.items.every((it, i) => it.term.text === items[i].term.text);
      active = { items, index: sameList ? active!.index : 0, cursor: selection.from };
      publish();
    };

    return [
      new Plugin<DecorationSet>({
        key: linksKey,
        state: {
          init: (_, state) => scan(state),
          apply: (tr, old, _oldState, newState) =>
            tr.docChanged || tr.getMeta(SMART_TEXT_REFRESH) ? scan(newState) : old,
        },
        props: {
          decorations: (state) => linksKey.getState(state),
        },
      }),
      new Plugin({
        key: suggestKey,
        view: (view) => {
          viewRef = view;
          return {
            update: (v, prevState) => {
              if (v.state.doc.eq(prevState.doc) && v.state.selection.eq(prevState.selection)) return;
              refresh(v);
            },
            destroy: () => {
              viewRef = null;
              onSuggestionChange(null);
            },
          };
        },
        props: {
          handleKeyDown: (view, event) => {
            if (!active) return false;
            const count = active.items.length;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              active.index = (active.index + (event.key === "ArrowDown" ? 1 : count - 1)) % count;
              publish();
              return true;
            }
            if (event.key === "Enter" || event.key === "Tab") {
              accept(active.index);
              return true;
            }
            if (event.key === "Escape") {
              suppressedAt = view.state.selection.from - trailingWordLength(textBeforeCursor(view.state));
              close();
              return true;
            }
            return false;
          },
          handleDOMEvents: {
            blur: () => {
              close();
              return false;
            },
          },
        },
      }),
    ];
  },
});
