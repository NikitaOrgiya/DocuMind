"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AIProviderKind } from "@/lib/config";
import { SidebarContent } from "./sidebar";

interface MobileHeaderProps {
  aiProvider: AIProviderKind;
  documentCount: number;
}

/**
 * Mobile-only (`md:hidden`) top bar + slide-in drawer, reusing
 * SidebarContent verbatim — same data, same components as the desktop
 * sidebar, just a different shell. Below `md` the desktop `<aside>` is
 * `display:none`, so this is the only way to reach History/Knowledge
 * Base/New chat on a phone.
 */
export function MobileHeader({ aiProvider, documentCount }: MobileHeaderProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <>
      <header className="flex items-center gap-3 border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Открыть меню"
          className="rounded-lg p-1.5 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-neutral-900">DocuMind</span>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-neutral-50 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-200 p-3">
              <span className="text-sm font-semibold text-neutral-900">DocuMind</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Закрыть меню"
                className="rounded-lg p-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <SidebarContent
              aiProvider={aiProvider}
              documentCount={documentCount}
              onNavigate={() => setOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
