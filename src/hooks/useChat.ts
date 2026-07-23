"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: string;
  title: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

interface UseChatOptions {
  documentContentRef: React.MutableRefObject<string>;
  documentId?: string;
  genre?: string;
  bibleContext?: string;
  includeDocument?: boolean;
}

export function useChat(options: UseChatOptions) {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(
    !!options.documentId && !!user,
  );

  // Load sessions
  useEffect(() => {
    if (!options.documentId || !user) return;
    fetch(`/api/chat/sessions?documentId=${options.documentId}`)
      .then((r) => r.json())
      .then((data: ChatSession[]) => {
        setSessions(data);
        setSessionsLoading(false);
      })
      .catch(() => setSessionsLoading(false));
  }, [options.documentId, user]);

  const startNewSession = useCallback(() => {
    setCurrentSessionId(null);
    setMessages([]);
    setInput("");
  }, []);

  const loadSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    try {
      const res = await fetch(`/api/chat/sessions/${sessionId}`);
      const data = (await res.json()) as { role: string; content: string }[];
      setMessages(
        data.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      );
    } catch (err) {
      console.error("Failed to load session:", err);
    }
  }, []);

  const sendMessage = useCallback(
    async (overrideInput?: string) => {
      const text = (overrideInput ?? input).trim();
      if (!text || loading) return;

      const userMessage: Message = { role: "user", content: text };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setInput("");
      setLoading(true);

      // Track session ID locally — state updates are async
      let activeSessionId = currentSessionId;

      try {
        const currentContent = options.documentContentRef.current;

        const systemContext = [
          "You are Prosr, a warm but honest literary writing assistant.",
          "Celebrate what's working, flag what isn't. Be specific and kind.",
          "Never rewrite for the writer — guide them to find the answer themselves.",
          "IMPORTANT: Use the Story Bible data to ensure consistency.",
          options.genre
            ? `The writer is working in the ${options.genre} genre.`
            : "",
          options.bibleContext ?? "",
          options.includeDocument && currentContent
            ? `\n\nCURRENT DOCUMENT:\n---\n${currentContent.replace(/<[^>]+>/g, " ").slice(0, 4000)}\n---`
            : "",
        ]
          .filter(Boolean)
          .join("\n");

        // Create session if needed
        if (!activeSessionId && options.documentId) {
          const sessionRes = await fetch("/api/chat/sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              documentId: options.documentId,
              title: text.slice(0, 60),
            }),
          });
          const newSession = (await sessionRes.json()) as ChatSession;
          activeSessionId = newSession.id;
          setCurrentSessionId(newSession.id);
          setSessions((prev) => [newSession, ...prev]);
        }

        // Send to AI — only last 20 messages to avoid token limits
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system: systemContext,
            messages: updatedMessages.slice(-20),
          }),
        });

        if (!response.ok) throw new Error("Chat failed");

        const data = (await response.json()) as { content: string };
        const assistantContent = data.content ?? "Something went wrong.";
        const assistantMessage: Message = {
          role: "assistant",
          content: assistantContent,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Save messages to DB
        if (activeSessionId) {
          const saveRes = await fetch(
            `/api/chat/sessions/${activeSessionId}/messages`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                messages: [
                  { role: "user", content: text },
                  { role: "assistant", content: assistantContent },
                ],
              }),
            },
          );

          if (!saveRes.ok) {
            console.error("Failed to save messages:", await saveRes.text());
          }

          // Update session message count
          await fetch(`/api/chat/sessions/${activeSessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messageCount: updatedMessages.length + 1,
            }),
          });

          // Update local sessions list
          setSessions((prev) =>
            prev.map((s) =>
              s.id === activeSessionId
                ? {
                    ...s,
                    messageCount: (s.messageCount ?? 0) + 2,
                    updatedAt: new Date().toISOString(),
                  }
                : s,
            ),
          );
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: "Something went wrong. Please try again.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, currentSessionId, options],
  );

  return {
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
  };
}
