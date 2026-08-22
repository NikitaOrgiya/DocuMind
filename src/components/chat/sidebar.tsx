"use client";

import { FileStack, MessageSquarePlus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import type { ChatSessionRecord } from "@/types/domain";

export function Sidebar() {
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
      <div className="p-3">
        <Link
          href="/app"
          className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-900 shadow-sm transition-colors hover:bg-neutral-50"
        >
          <MessageSquarePlus className="h-4 w-4" />
          New chat
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="px-1 pb-1.5 pt-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
          History
        </p>
        {sessions.length === 0 ? (
          <p className="px-1 text-xs text-neutral-400">No conversations yet.</p>
        ) : (
          <ul className="flex flex-col gap-0.5">
            {sessions.map((session) => (
              <li key={session.id}>
                <Link
                  href={`/app/chat/${session.id}`}
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

      <div className="flex items-center gap-2 border-t border-neutral-200 px-4 py-3 text-xs text-neutral-400">
        <FileStack className="h-3.5 w-3.5" />
        5 documents indexed
      </div>
    </aside>
  );
}
