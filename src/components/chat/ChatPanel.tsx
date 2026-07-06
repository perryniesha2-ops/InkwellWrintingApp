"use client;";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  MessageSquare,
  Plus,
  ChevronLeft,
  Clock,
  Feather,
  FileText,
} from "lucide-react";
import { useChat } from "@/hooks/useChat";

interface ChatPanelProps {
  documentContent: string;
  documentId?: string;
  genre?: string;
  bibleContext?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatPanel({
  documentContent,
  documentId,
  genre,
  bibleContext,
  isOpen,
  onToggle,
}: ChatPanelProps) {
  const documentContentRef = useRef(documentContent);
  useEffect(() => {
    documentContentRef.current = documentContent;
  }, [documentContent]);

  const [view, setView] = useState<"chat" | "history">("chat");
  const [includeDocument, setIncludeDocument] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    input,
    setInput,
    loading,
    sendMessage,
    sessions,
    sessionsLoading,
    currentSessionId,
    loadSession,
    startNewSession,
  } = useChat({
    documentContentRef,
    documentId,
    genre,
    bibleContext,
    includeDocument,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const QUICK_PROMPTS = [
    "Review my latest writing",
    "Help me develop this scene",
    "Is my pacing working?",
    "Suggest what happens next",
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 320 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 320 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed right-0 top-0 bottom-0 w-80 flex flex-col z-40"
          style={{
            background: "var(--bg-surface)",
            borderLeft: "1px solid var(--border-color)",
            fontFamily: "Inter, sans-serif",
          }}
        >
          {/* Header */}
          <div
            style={{
              borderBottom: "1px solid var(--border-color)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                height: "48px",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "8px" }}
              >
                {view === "history" && (
                  <button
                    onClick={() => setView("chat")}
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
                    <ChevronLeft style={{ width: "14px", height: "14px" }} />
                  </button>
                )}
                <Feather
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
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {view === "history" ? "Chat History" : "Inkwell Assistant"}
                </span>
              </div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "4px" }}
              >
                {view === "chat" && (
                  <button
                    onClick={() => setView("history")}
                    style={{
                      color: "var(--text-muted)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      padding: "4px",
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
                    <Clock style={{ width: "14px", height: "14px" }} />
                  </button>
                )}
                <button
                  onClick={onToggle}
                  style={{
                    color: "var(--text-muted)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    padding: "4px",
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
                  <X style={{ width: "14px", height: "14px" }} />
                </button>
              </div>
            </div>

            {/* Document toggle */}
            {view === "chat" && (
              <div
                style={{
                  padding: "8px 16px",
                  borderTop: "1px solid var(--border-color)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--bg-elevated)",
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "center", gap: "6px" }}
                >
                  <FileText
                    style={{
                      width: "12px",
                      height: "12px",
                      color: "var(--text-dim)",
                    }}
                  />
                  <span
                    style={{ fontSize: "11px", color: "var(--text-muted)" }}
                  >
                    Send document with messages
                  </span>
                  {includeDocument && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--gold-primary)",
                        fontWeight: 600,
                      }}
                    >
                      ·{" "}
                      {Math.round(
                        documentContent
                          .replace(/<[^>]+>/g, "")
                          .split(/\s+/)
                          .filter(Boolean).length / 100,
                      ) / 10}
                      k words
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setIncludeDocument((v) => !v)}
                  style={{
                    width: "32px",
                    height: "18px",
                    borderRadius: "9px",
                    background: includeDocument
                      ? "var(--gold-primary)"
                      : "var(--bg-overlay)",
                    border: "none",
                    cursor: "pointer",
                    position: "relative",
                    transition: "background 0.2s",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      top: "2px",
                      left: includeDocument ? "16px" : "2px",
                      width: "14px",
                      height: "14px",
                      borderRadius: "50%",
                      background: "var(--text-primary)",
                      transition: "left 0.2s",
                    }}
                  />
                </button>
              </div>
            )}
          </div>

          {/* History view */}
          {view === "history" && (
            <div
              style={{
                flex: 1,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-color)",
                }}
              >
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--text-dim)",
                  }}
                >
                  Previous Chats
                </span>
                <button
                  onClick={() => {
                    startNewSession();
                    setView("chat");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                    padding: "5px 10px",
                    background: "var(--gold-primary)",
                    color: "var(--bg-primary)",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: 600,
                  }}
                >
                  <Plus style={{ width: "12px", height: "12px" }} />
                  New Chat
                </button>
              </div>

              <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
                {sessionsLoading ? (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      padding: "2rem",
                    }}
                  >
                    <Loader2
                      style={{
                        width: "16px",
                        height: "16px",
                        color: "var(--gold-primary)",
                      }}
                      className="animate-spin"
                    />
                  </div>
                ) : sessions.length === 0 ? (
                  <p
                    style={{
                      fontSize: "12px",
                      color: "var(--text-dim)",
                      fontStyle: "italic",
                      padding: "2rem",
                      textAlign: "center",
                    }}
                  >
                    No previous chats yet.
                  </p>
                ) : (
                  sessions.map((session) => (
                    <button
                      key={session.id}
                      onClick={() => {
                        void loadSession(session.id);
                        setView("chat");
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        marginBottom: "2px",
                        background:
                          currentSessionId === session.id
                            ? "var(--gold-subtle)"
                            : "transparent",
                        border: "none",
                        borderLeft:
                          currentSessionId === session.id
                            ? "2px solid var(--gold-primary)"
                            : "2px solid transparent",
                        cursor: "pointer",
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (currentSessionId !== session.id)
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--bg-elevated)";
                      }}
                      onMouseLeave={(e) => {
                        if (currentSessionId !== session.id)
                          (e.currentTarget as HTMLElement).style.background =
                            "transparent";
                      }}
                    >
                      <p
                        style={{
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          margin: "0 0 4px 0",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {session.title ?? "Untitled chat"}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        <Clock
                          style={{
                            width: "10px",
                            height: "10px",
                            color: "var(--text-dim)",
                          }}
                        />
                        <span
                          style={{ fontSize: "10px", color: "var(--text-dim)" }}
                        >
                          {new Date(
                            session.updatedAt ?? session.createdAt,
                          ).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {session.messageCount
                            ? ` · ${session.messageCount} messages`
                            : ""}
                        </span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Chat view */}
          {view === "chat" && (
            <>
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                }}
              >
                {messages.length === 0 && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      flex: 1,
                      textAlign: "center",
                      padding: "2rem 1rem",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "var(--gold-subtle)",
                        border: "1px solid var(--gold-border)",
                        marginBottom: "1rem",
                      }}
                    >
                      <MessageSquare
                        style={{
                          width: "18px",
                          height: "18px",
                          color: "var(--gold-primary)",
                        }}
                      />
                    </div>
                    <p
                      style={{
                        fontSize: "13px",
                        color: "var(--text-muted)",
                        fontStyle: "italic",
                        margin: "0 0 1rem 0",
                      }}
                    >
                      How may I assist your writing today?
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "4px",
                        width: "100%",
                      }}
                    >
                      {QUICK_PROMPTS.map((prompt) => (
                        <button
                          key={prompt}
                          onClick={() => void sendMessage(prompt)}
                          style={{
                            padding: "8px 12px",
                            textAlign: "left",
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border-color)",
                            color: "var(--text-secondary)",
                            fontSize: "12px",
                            cursor: "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor =
                              "var(--gold-border)";
                            (e.currentTarget as HTMLElement).style.color =
                              "var(--text-primary)";
                          }}
                          onMouseLeave={(e) => {
                            (e.currentTarget as HTMLElement).style.borderColor =
                              "var(--border-color)";
                            (e.currentTarget as HTMLElement).style.color =
                              "var(--text-secondary)";
                          }}
                        >
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
                      flexDirection: "column",
                      alignItems:
                        msg.role === "user" ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      className={
                        msg.role === "user"
                          ? "chat-bubble-user"
                          : "chat-bubble-ai"
                      }
                      style={{ maxWidth: "88%" }}
                    >
                      <p
                        style={{
                          margin: 0,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                        }}
                      >
                        {msg.content}
                      </p>
                    </div>
                  </div>
                ))}

                {loading && (
                  <div style={{ display: "flex", alignItems: "flex-start" }}>
                    <div
                      className="chat-bubble-ai"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Loader2
                        style={{
                          width: "12px",
                          height: "12px",
                          color: "var(--gold-primary)",
                        }}
                        className="animate-spin"
                      />
                      <span
                        style={{
                          fontSize: "12px",
                          color: "var(--text-muted)",
                          fontStyle: "italic",
                        }}
                      >
                        Thinking…
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div
                style={{
                  borderTop: "1px solid var(--border-color)",
                  padding: "12px",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "flex-end",
                  }}
                >
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask anything about your story…"
                    rows={1}
                    style={{
                      flex: 1,
                      resize: "none",
                      padding: "8px 10px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      fontSize: "13px",
                      fontFamily: "Inter",
                      outline: "none",
                      lineHeight: "1.5",
                      maxHeight: "120px",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "var(--gold-primary)";
                      e.target.style.boxShadow = "0 0 0 3px var(--gold-glow)";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "var(--border-color)";
                      e.target.style.boxShadow = "none";
                    }}
                    onInput={(e) => {
                      const t = e.target as HTMLTextAreaElement;
                      t.style.height = "auto";
                      t.style.height = Math.min(t.scrollHeight, 120) + "px";
                    }}
                  />
                  <button
                    onClick={() => void sendMessage()}
                    disabled={loading || !input.trim()}
                    style={{
                      width: "34px",
                      height: "34px",
                      flexShrink: 0,
                      background: input.trim()
                        ? "var(--gold-primary)"
                        : "var(--bg-elevated)",
                      border: "1px solid",
                      borderColor: input.trim()
                        ? "var(--gold-primary)"
                        : "var(--border-color)",
                      color: input.trim()
                        ? "var(--bg-primary)"
                        : "var(--text-dim)",
                      cursor: input.trim() ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s",
                    }}
                  >
                    {loading ? (
                      <Loader2
                        style={{ width: "14px", height: "14px" }}
                        className="animate-spin"
                      />
                    ) : (
                      <Send style={{ width: "14px", height: "14px" }} />
                    )}
                  </button>
                </div>
                <p
                  style={{
                    fontSize: "10px",
                    color: "var(--text-dim)",
                    marginTop: "6px",
                    textAlign: "center",
                  }}
                >
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
