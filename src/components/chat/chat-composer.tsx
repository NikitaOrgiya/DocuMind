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

const MIN_QUESTION_LENGTH = 3;

export function ChatComposer({ value, onChange, onSubmit, disabled }: ChatComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const trimmedLength = value.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_QUESTION_LENGTH;
  const canSubmit = !disabled && trimmedLength >= MIN_QUESTION_LENGTH;

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (canSubmit) {
        onSubmit();
      }
    }
  }

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="border-t border-neutral-200 bg-white/80 px-3 py-3 backdrop-blur sm:px-6 sm:py-4"
    >
      <div className="mx-auto flex w-full max-w-3xl items-end gap-1.5 rounded-3xl border border-neutral-200 bg-white py-1.5 pl-4 pr-1.5 shadow-sm transition-colors focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос по проиндексированным документам…"
          rows={2}
          maxLength={2000}
          disabled={disabled}
          className="max-h-40 flex-1 py-1.5 leading-relaxed"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit}
          aria-label="Отправить вопрос"
          title={tooShort ? `Вопрос должен содержать не менее ${MIN_QUESTION_LENGTH} символов.` : undefined}
          className="!rounded-full shrink-0"
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      {tooShort && (
        <p className="mx-auto mt-1.5 max-w-3xl px-1 text-xs text-neutral-400">
          Вопрос должен содержать не менее {MIN_QUESTION_LENGTH} символов.
        </p>
      )}
    </form>
  );
}
