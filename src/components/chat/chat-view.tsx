"use client";

import { AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import type { ChatMessageRecord } from "@/types/domain";
import { ChatComposer } from "./chat-composer";
import { ChatMessageBubble } from "./chat-message";
import { EmptyState } from "./empty-state";
import { LoadingIndicator } from "./loading-indicator";

interface ChatViewProps {
  sessionId: string | null;
  initialMessages: ChatMessageRecord[];
}

interface ChatApiResponse {
  session: { id: string; title: string };
  userMessage: ChatMessageRecord;
  assistantMessage: ChatMessageRecord;
}

export function ChatView({ sessionId: initialSessionId, initialMessages }: ChatViewProps) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState(initialSessionId);
  const [messages, setMessages] = useState<ChatMessageRecord[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  async function sendQuestion(question: string) {
    setError(null);
    setLastQuestion(question);
    setLoading(true);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, sessionId: sessionId ?? undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Не удалось сформировать ответ. Попробуйте ещё раз.");
      }

      const payload = data as ChatApiResponse;
      setMessages((prev) => [...prev, payload.userMessage, payload.assistantMessage]);

      if (!sessionId) {
        setSessionId(payload.session.id);
        router.replace(`/app/chat/${payload.session.id}`);
      }
      setLastQuestion(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сформировать ответ.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin">
        {messages.length === 0 ? (
          <EmptyState onSelect={sendQuestion} loading={loading} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {loading && <LoadingIndicator />}
          </div>
        )}
      </div>

      {error && (
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 pb-2">
          <div className="flex flex-1 items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
          {lastQuestion && (
            <button
              type="button"
              onClick={() => sendQuestion(lastQuestion)}
              className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
            >
              Повторить
            </button>
          )}
        </div>
      )}

      <div className="mx-auto w-full max-w-3xl">
        <ChatComposer value={input} onChange={setInput} onSubmit={() => sendQuestion(input)} disabled={loading} />
      </div>
    </div>
  );
}
