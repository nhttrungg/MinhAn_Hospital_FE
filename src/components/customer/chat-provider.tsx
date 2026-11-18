"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { ChatReply } from "@/lib/chatbot-types";

type Turn = { id: string; question: string; reply?: ChatReply; error?: string };
type ChatState = {
  turns: Turn[];
  busy: boolean;
  send: (question: string, retryId?: string) => Promise<void>;
  reset: () => Promise<void>;
  stop: () => void;
};
const ChatContext = createContext<ChatState | null>(null);
export function ChatProvider({ children }: { children: ReactNode }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const active = useRef<AbortController | null>(null);
  const send = useCallback(async (raw: string, retryId?: string) => {
    const question = raw.trim();
    if (!question || question.length > 2000 || active.current) return;
    const id = retryId ?? crypto.randomUUID();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setTurns((old) =>
      retryId ? old.map((t) => (t.id === id ? { id, question } : t)) : [...old, { id, question }],
    );
    try {
      const reply = await api<ChatReply>("/api/v1/public/chat/messages", {
        method: "POST",
        body: JSON.stringify({ message: question, clientMessageId: id }),
        signal: controller.signal,
      });
      if (active.current === controller)
        setTurns((old) => old.map((t) => (t.id === id ? { ...t, reply } : t)));
    } catch (error) {
      if (active.current === controller)
        setTurns((old) =>
          old.map((t) =>
            t.id === id
              ? {
                  ...t,
                  error: controller.signal.aborted
                    ? "Đã dừng chờ phản hồi. Bạn có thể thử lại."
                    : error instanceof Error
                      ? error.message
                      : "Chưa gửi được câu hỏi.",
                }
              : t,
          ),
        );
    } finally {
      if (active.current === controller) {
        active.current = null;
        setBusy(false);
      }
    }
  }, []);
  const stop = useCallback(() => active.current?.abort(), []);
  const reset = useCallback(async () => {
    active.current?.abort();
    // The server serializes deletion with the in-flight request for this session.
    await api("/api/v1/public/chat/session", { method: "DELETE" });
    active.current = null;
    setTurns([]);
    setBusy(false);
  }, []);
  useEffect(() => {
    function authChanged() {
      active.current?.abort();
      active.current = null;
      setTurns([]);
      setBusy(false);
    }
    function expired(event: Event) {
      // An anonymous /auth/me response is expected on public/booking pages.
      if (
        event instanceof CustomEvent &&
        event.detail?.path === "/api/v1/auth/me" &&
        !/^\/(portal|staff)(\/|$)/.test(window.location.pathname)
      )
        return;
      authChanged();
    }
    window.addEventListener("antam-auth-changed", authChanged);
    window.addEventListener("antam-session-expired", expired);
    return () => {
      window.removeEventListener("antam-auth-changed", authChanged);
      window.removeEventListener("antam-session-expired", expired);
      active.current?.abort();
    };
  }, []);
  return (
    <ChatContext.Provider value={{ turns, busy, send, reset, stop }}>
      {children}
    </ChatContext.Provider>
  );
}
export function useChat() {
  const state = useContext(ChatContext);
  if (!state) throw new Error("Thiếu ChatProvider");
  return state;
}
