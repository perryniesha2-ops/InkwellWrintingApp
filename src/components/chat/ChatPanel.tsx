"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare, X, Send, Loader2, Plus,
  BookText, FileText, Highlighter, ChevronDown,
  Trash2, Bot,
} from "lucide-react";
import { useUser } from "@/hooks/useUser";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

interface ChatPanelProps {
  documentId?: string;
  documentContent?: string;
  genre?: string;
  bibleContext?: string;
  isOpen: boolean;
  onToggle: () => void;
  selectedText?: string;
}

type ManuscriptMode = "none" | "full" | "selection" | "chapter";

export default function ChatPanel({
  documentId, documentContent, genre, bibleContext,
  isOpen, onToggle, selectedText,
}: ChatPanelProps) {
  const { user } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [manuscriptMode, setManuscriptMode] = useState<ManuscriptMode>("none");
  const [manuscriptLoaded, setManuscriptLoaded] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load sessions
  useEffect(() => {
    if (!isOpen || !documentId || !user) return;
    let cancelled = false;

    const load = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setLoadingSessions(true);
      try {
        const res = await fetch(`/api/chat/sessions?documentId=${documentId}`);
        const data = await res.json() as ChatSession[];
        if (!cancelled) setSessions(data ?? []);
      } finally {
        if (!cancelled) setLoadingSessions(false);
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [isOpen, documentId, user]);

  // Auto-set selection mode when text is selected
  useEffect(() => {
    if (selectedText && selectedText.length > 20) {
      // Avoid synchronous setState inside effect (can trigger cascading renders).
      // Defer updates to the next task so the effect doesn't synchronously update state.
      const id = window.setTimeout(() => {
        setManuscriptMode("selection");
        setManuscriptLoaded(true);
      }, 0);
      return () => clearTimeout(id);
    }
  }, [selectedText]);

  const loadSession = async (sessionId: string) => {
    setActiveSessionId(sessionId);
    setShowSessions(false);
    const res = await fetch(`/api/chat/sessions/${sessionId}`);
    const data = await res.json() as Message[];
    setMessages(data ?? []);
  };

  const createSession = async () => {
    if (!documentId) return;
    const res = await fetch("/api/chat/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId, title: "New Chat" }),
    });
    const session = await res.json() as ChatSession;
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setMessages([]);
    setShowSessions(false);
  };

  const deleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/chat/sessions/${sessionId}`, { method: "DELETE" });
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
      setMessages([]);
    }
  };

  const handleLoadManuscript = (mode: ManuscriptMode) => {
    setManuscriptMode(mode);
    setManuscriptLoaded(true);
    setShowModeMenu(false);

    const modeMessages: Record<ManuscriptMode, string> = {
      full: "📖 Full manuscript loaded. I can now reference any part of your book.",
      selection: selectedText
        ? `✦ Selected passage loaded (${selectedText.split(/\s+/).filter(Boolean).length} words). Ready to review.`
        : "No text selected. Please select a passage in the editor first.",
      chapter: "📄 Current chapter loaded. Ready to review.",
      none: "",
    };

    if (modeMessages[mode]) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: modeMessages[mode] },
      ]);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading || !documentId) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);

    try {
      // Create session if none
      let sessionId = activeSessionId;
      if (!sessionId) {
        const res = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            title: userMessage.slice(0, 50),
          }),
        });
        const session = await res.json() as ChatSession;
        sessionId = session.id;
        setActiveSessionId(session.id);
        setSessions((prev) => [session, ...prev]);
      }

      // Use manuscript route if manuscript is loaded
      const useManuscriptRoute = manuscriptLoaded && manuscriptMode !== "none";

      let assistantContent = "";

      if (useManuscriptRoute) {
        const res = await fetch("/api/chat/manuscript", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            documentId,
            mode: manuscriptMode,
            selectedText: manuscriptMode === "selection" ? selectedText : undefined,
            userMessage,
            sessionHistory: messages.slice(-10),
            bibleContext,
            genre,
          }),
        });
        const data = await res.json() as { content: string };
        assistantContent = data.content;
      } else {
        // Regular chat
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: newMessages.slice(-10),
            documentContent: documentContent?.slice(0, 4000),
            bibleContext,
            genre,
          }),
        });
        const data = await res.json() as { content: string };
        assistantContent = data.content;
      }

      const assistantMessage: Message = { role: "assistant", content: assistantContent };
      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);

      // Save messages
      await fetch(`/api/chat/sessions/${sessionId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "user", content: userMessage },
            { role: "assistant", content: assistantContent },
          ],
        }),
      });

      // Update session title on first message
      if (messages.length === 0) {
        await fetch(`/api/chat/sessions/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: userMessage.slice(0, 50),
            messageCount: finalMessages.length,
          }),
        });
        setSessions((prev) => prev.map((s) =>
          s.id === sessionId
            ? { ...s, title: userMessage.slice(0, 50) }
            : s
        ));
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [
    input, loading, documentId, activeSessionId, messages,
    manuscriptLoaded, manuscriptMode, selectedText,
    bibleContext, genre, documentContent,
  ]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          style={{
            position: "fixed", right: 0, top: "48px", bottom: 0,
            width: "340px", display: "flex", flexDirection: "column",
            zIndex: 40, background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border-color)",
          }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 14px", height: "48px", borderBottom: "1px solid var(--border-color)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Bot style={{ width: "14px", height: "14px", color: "var(--gold-primary)" }} />
              <span style={{ fontFamily: "var(--font-dm-sans)", fontWeight: 700, fontSize: "13px", color: "var(--text-primary)", letterSpacing: "-0.01em" }}>
                AI Assistant
              </span>
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              {/* Session history */}
              <button
                onClick={() => setShowSessions((s) => !s)}
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px", position: "relative" }}
                title="Chat history">
                <MessageSquare style={{ width: "14px", height: "14px" }} />
                {sessions.length > 0 && (
                  <span style={{ position: "absolute", top: "2px", right: "2px", width: "6px", height: "6px", background: "var(--gold-primary)", borderRadius: "50%" }} />
                )}
              </button>
              {/* New chat */}
              <button
                onClick={() => void createSession()}
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}
                title="New chat">
                <Plus style={{ width: "14px", height: "14px" }} />
              </button>
              <button
                onClick={onToggle}
                style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer", display: "flex", padding: "4px" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-primary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-muted)"; }}>
                <X style={{ width: "14px", height: "14px" }} />
              </button>
            </div>
          </div>

          {/* Session list dropdown */}
          <AnimatePresence>
            {showSessions && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden", borderBottom: "1px solid var(--border-color)", background: "var(--bg-elevated)", flexShrink: 0, maxHeight: "200px", overflowY: "auto" }}>
                {loadingSessions ? (
                  <div style={{ padding: "12px", display: "flex", justifyContent: "center" }}>
                    <Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />
                  </div>
                ) : sessions.length === 0 ? (
                  <p style={{ padding: "12px", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", margin: 0 }}>
                    No previous chats.
                  </p>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => void loadSession(session.id)}
                      style={{
                        width: "100%", textAlign: "left", padding: "10px 14px",
                        background: activeSessionId === session.id ? "var(--gold-subtle)" : "transparent",
                        border: "none", borderBottom: "1px solid var(--border-color)",
                        cursor: "pointer", display: "flex", alignItems: "center",
                        justifyContent: "space-between", gap: "8px",
                        transition: "background 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (activeSessionId !== session.id)
                          (e.currentTarget as HTMLElement).style.background = "var(--bg-overlay)";
                      }}
                      onMouseLeave={(e) => {
                        if (activeSessionId !== session.id)
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                      }}>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 500, color: "var(--text-primary)", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {session.title || "Untitled chat"}
                        </p>
                        <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", margin: 0 }}>
                          {session.message_count} messages
                        </p>
                      </div>
                      <button
                        onClick={(e) => void deleteSession(session.id, e)}
                        style={{ color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", display: "flex", flexShrink: 0, padding: "2px" }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "#ef4444"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-dim)"; }}>
                        <Trash2 style={{ width: "12px", height: "12px" }} />
                      </button>
                    </button>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manuscript mode bar */}
          <div style={{ padding: "8px 12px", borderBottom: "1px solid var(--border-color)", flexShrink: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ position: "relative", flex: 1 }}>
              <button
                onClick={() => setShowModeMenu((s) => !s)}
                style={{
                  width: "100%", display: "flex", alignItems: "center",
                  justifyContent: "space-between", gap: "6px",
                  padding: "6px 10px",
                  background: manuscriptLoaded ? "var(--gold-subtle)" : "var(--bg-elevated)",
                  border: `1px solid ${manuscriptLoaded ? "var(--gold-border)" : "var(--border-color)"}`,
                  color: manuscriptLoaded ? "var(--gold-primary)" : "var(--text-muted)",
                  cursor: "pointer", fontSize: "11px",
                  fontFamily: "var(--font-inter)", fontWeight: 600,
                  transition: "all 0.15s",
                }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {manuscriptMode === "full" && <BookText style={{ width: "12px", height: "12px" }} />}
                  {manuscriptMode === "selection" && <Highlighter style={{ width: "12px", height: "12px" }} />}
                  {manuscriptMode === "chapter" && <FileText style={{ width: "12px", height: "12px" }} />}
                  {manuscriptMode === "none" && <BookText style={{ width: "12px", height: "12px" }} />}
                  <span>
                    {manuscriptMode === "none" && "Load Manuscript"}
                    {manuscriptMode === "full" && "Full Manuscript"}
                    {manuscriptMode === "selection" && selectedText
                      ? `Selection (${selectedText.split(/\s+/).filter(Boolean).length}w)`
                      : manuscriptMode === "selection" && "Selection"}
                    {manuscriptMode === "chapter" && "Current Chapter"}
                  </span>
                </div>
                <ChevronDown style={{ width: "11px", height: "11px" }} />
              </button>

              {/* Mode dropdown */}
              <AnimatePresence>
                {showModeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    style={{
                      position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                      background: "var(--bg-surface)", border: "1px solid var(--border-color)",
                      zIndex: 100, boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                    }}>
                    {[
                      { mode: "full" as ManuscriptMode, icon: BookText, label: "Full Manuscript", desc: "Load entire book as context" },
                      { mode: "chapter" as ManuscriptMode, icon: FileText, label: "Current Chapter", desc: "Just the chapter you're writing" },
                      { mode: "selection" as ManuscriptMode, icon: Highlighter, label: "Selected Text", desc: selectedText ? `${selectedText.split(/\s+/).filter(Boolean).length} words selected` : "Select text in editor first" },
                    ].map(({ mode, icon: Icon, label, desc }) => (
                      <button
                        key={mode}
                        onClick={() => handleLoadManuscript(mode)}
                        disabled={mode === "selection" && !selectedText}
                        style={{
                          width: "100%", textAlign: "left",
                          padding: "10px 12px",
                          background: manuscriptMode === mode ? "var(--gold-subtle)" : "transparent",
                          border: "none", borderBottom: "1px solid var(--border-color)",
                          cursor: mode === "selection" && !selectedText ? "not-allowed" : "pointer",
                          opacity: mode === "selection" && !selectedText ? 0.5 : 1,
                          display: "flex", alignItems: "flex-start", gap: "8px",
                          transition: "background 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!(mode === "selection" && !selectedText))
                            (e.currentTarget as HTMLElement).style.background = "var(--bg-elevated)";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            manuscriptMode === mode ? "var(--gold-subtle)" : "transparent";
                        }}>
                        <Icon style={{ width: "13px", height: "13px", color: manuscriptMode === mode ? "var(--gold-primary)" : "var(--text-muted)", marginTop: "1px", flexShrink: 0 }} />
                        <div>
                          <p style={{ fontSize: "12px", fontFamily: "var(--font-inter)", fontWeight: 600, color: manuscriptMode === mode ? "var(--gold-primary)" : "var(--text-primary)", margin: 0 }}>
                            {label}
                          </p>
                          <p style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)", margin: 0 }}>
                            {desc}
                          </p>
                        </div>
                      </button>
                    ))}
                    {/* Clear */}
                    {manuscriptLoaded && (
                      <button
                        onClick={() => { setManuscriptMode("none"); setManuscriptLoaded(false); setShowModeMenu(false); }}
                        style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: "transparent", border: "none", cursor: "pointer", fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                        Clear manuscript context
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: "auto", padding: "14px", display: "flex", flexDirection: "column", gap: "12px", minHeight: 0 }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                <Bot style={{ width: "32px", height: "32px", color: "var(--gold-primary)", opacity: 0.3, margin: "0 auto 1rem" }} />
                <p style={{ fontSize: "13px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", marginBottom: "8px" }}>
                  {manuscriptLoaded
                    ? "Manuscript loaded. Ask me anything about your book."
                    : "Ask me anything about your writing."}
                </p>
                {!manuscriptLoaded && (
                  <p style={{ fontSize: "11px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                    Load your manuscript above to unlock full-book analysis, proofreading, and editing.
                  </p>
                )}
                {/* Quick prompts */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "1rem" }}>
                  {(manuscriptLoaded ? [
                    "Proofread this for grammar and style",
                    "Does anything feel inconsistent?",
                    "How can I improve the pacing?",
                    "Suggest a stronger opening line",
                  ] : [
                    "Help me write the next scene",
                    "Suggest dialogue for this character",
                    "How do I show instead of tell here?",
                  ]).map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
                      style={{ padding: "6px 10px", background: "var(--bg-elevated)", border: "1px solid var(--border-color)", color: "var(--text-muted)", cursor: "pointer", fontSize: "11px", fontFamily: "var(--font-inter)", textAlign: "left", transition: "all 0.15s" }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--gold-border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border-color)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                      }}>
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}>
                <div style={{
                  maxWidth: "90%",
                  padding: "10px 12px",
                  background: msg.role === "user" ? "var(--gold-primary)" : "var(--bg-elevated)",
                  color: msg.role === "user" ? "var(--bg-primary)" : "var(--text-primary)",
                  fontSize: "13px",
                  fontFamily: "var(--font-inter)",
                  lineHeight: 1.6,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}>
                  {msg.content}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 12px", background: "var(--bg-elevated)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Loader2 style={{ width: "13px", height: "13px", color: "var(--gold-primary)" }} className="animate-spin" />
                  <span style={{ fontSize: "12px", fontFamily: "var(--font-inter)", color: "var(--text-muted)", fontStyle: "italic" }}>
                    {manuscriptLoaded ? "Analyzing manuscript…" : "Thinking…"}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "12px 14px", borderTop: "1px solid var(--border-color)", flexShrink: 0 }}>
            {/* Show active context indicator */}
            {manuscriptLoaded && (
              <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%", flexShrink: 0 }} />
                <span style={{ fontSize: "10px", fontFamily: "var(--font-inter)", color: "var(--text-dim)" }}>
                  {manuscriptMode === "full" && "Full manuscript context active"}
                  {manuscriptMode === "selection" && "Selected passage context active"}
                  {manuscriptMode === "chapter" && "Chapter context active"}
                </span>
              </div>
            )}
            <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                placeholder={manuscriptLoaded
                  ? "Ask about your manuscript…"
                  : "Ask anything… (Shift+Enter for new line)"}
                rows={1}
                style={{
                  flex: 1, resize: "none", outline: "none",
                  padding: "8px 10px",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  fontSize: "13px", fontFamily: "var(--font-inter)",
                  lineHeight: 1.6,
                  maxHeight: "120px", overflowY: "auto",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => { e.target.style.borderColor = "var(--gold-primary)"; }}
                onBlur={(e) => { e.target.style.borderColor = "var(--border-color)"; }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                }}
              />
              <button
                onClick={() => void sendMessage()}
                disabled={loading || !input.trim()}
                style={{
                  padding: "8px 12px", flexShrink: 0,
                  background: input.trim() ? "var(--gold-primary)" : "var(--bg-elevated)",
                  color: input.trim() ? "var(--bg-primary)" : "var(--text-dim)",
                  border: "none", cursor: input.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                {loading
                  ? <Loader2 style={{ width: "14px", height: "14px" }} className="animate-spin" />
                  : <Send style={{ width: "14px", height: "14px" }} />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}