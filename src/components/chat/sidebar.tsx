"use client";

import { BookMarked, Cloud, Cpu, FlaskConical, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { pluralizeRu } from "@/lib/i18n/pluralize-ru";
import { cn } from "@/lib/utils";
import type { AIProviderKind } from "@/lib/config";
import type { ChatSessionRecord } from "@/types/domain";

interface SidebarProps {
  aiProvider: AIProviderKind;
  documentCount: number;
}

export function Sidebar({ aiProvider, documentCount }: SidebarProps) {
  const pathname = usePathname();
  const [sessions, setSessions] = useState<ChatSessionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/sessions")
      .then((res) => (res.ok ? res.json() : { sessions: [] }))
      .then((data) => {
        if (!cancelled) setSessions(data.sessions ?? []);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <aside className="hidden h-full w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50/60 md:flex">
      <div className="flex flex-col gap-1.5 p-3">
        <Link
          href="/app"
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Новый чат
        </Link>
        <Link
          href="/app/documents"
          className={cn(
            "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900",
            pathname.startsWith("/app/documents") && "bg-neutral-100 text-neutral-900"
          )}
        >
          <span className="flex items-center gap-2">
            <BookMarked className="h-4 w-4" />
            База знаний
          </span>
          <span className="text-xs text-neutral-400">{documentCount}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-1 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          История
        </p>
        {sessions.length === 0 ? (
          <p className="px-1 text-xs text-neutral-400">Разговоров пока нет.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {/* prefetch=false: these links auto-prefetch on mount by default,
                which in dev mode was observed to trigger a Turbopack
                background recompile of /app/chat/[id] as soon as a session
                appeared in history — occasionally remounting the actively
                mounted /app page mid-interaction and silently discarding
                in-progress composer state. Production builds aren't
                affected (no dev-mode HMR), but disabling prefetch here has
                no real UX cost for links a user may never click. */}
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/app/chat/${session.id}`}
                  prefetch={false}
                  className={cn(
                    "block truncate rounded-md px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900",
                    pathname === `/app/chat/${session.id}` && "bg-neutral-100 font-medium text-neutral-900"
                  )}
                >
                  {session.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-neutral-200 px-4 py-3 text-xs text-neutral-400">
        <div>
          {documentCount} {pluralizeRu(documentCount, "документ", "документа", "документов")} в базе
          знаний
        </div>
        {aiProvider === "mock" && (
          <div
            className="mt-1.5 flex items-center gap-1.5 text-amber-600"
            title="DOCUMIND_AI_PROVIDER не задан (или =mock) — используется детерминированный локальный mock вместо реального пайплайна. См. README."
          >
            <FlaskConical className="h-3.5 w-3.5" />
            Локальный демо-режим
          </div>
        )}
        {aiProvider === "ollama" && (
          <div
            className="mt-1.5 flex items-center gap-1.5 text-emerald-600"
            title="Ollama работает локально — embeddings и генерация выполняются на этой машине, без внешних API-вызовов."
          >
            <Cpu className="h-3.5 w-3.5" />
            Локальный AI — Ollama
          </div>
        )}
        {aiProvider === "openai" && (
          <div className="mt-1.5 flex items-center gap-1.5 text-sky-600">
            <Cloud className="h-3.5 w-3.5" />
            Облачный AI — OpenAI
          </div>
        )}
      </div>
    </aside>
  );
}
