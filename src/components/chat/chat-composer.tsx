"use client";

import { SendHorizontal } from "lucide-react";
import { useRef, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatComposerProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
}

export function ChatComposer({ value, onChange, onSubmit, disabled }: ChatComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (!disabled && value.trim().length >= 3) {
        onSubmit();
      }
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled && value.trim().length >= 3) onSubmit();
      }}
      className="flex items-end gap-2 border-t border-neutral-200 bg-white/80 p-4 backdrop-blur"
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask a question about the indexed documents…"
        rows={2}
        maxLength={2000}
        disabled={disabled}
        className="flex-1"
      />
      <Button
        type="submit"
        size="icon"
        disabled={disabled || value.trim().length < 3}
        aria-label="Send question"
      >
        <SendHorizontal className="h-4 w-4" />
      </Button>
    </form>
  );
}
