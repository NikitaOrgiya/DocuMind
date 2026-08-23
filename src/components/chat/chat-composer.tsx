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
      className="border-t border-neutral-200 bg-white/80 p-4 backdrop-blur"
    >
      <div className="flex items-end gap-2">
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос по проиндексированным документам…"
          rows={2}
          maxLength={2000}
          disabled={disabled}
          className="flex-1"
        />
        <Button
          type="submit"
          size="icon"
          disabled={!canSubmit}
          aria-label="Отправить вопрос"
          title={tooShort ? `Вопрос должен содержать не менее ${MIN_QUESTION_LENGTH} символов.` : undefined}
        >
          <SendHorizontal className="h-4 w-4" />
        </Button>
      </div>
      {tooShort && (
        <p className="mt-1.5 text-xs text-neutral-400">
          Вопрос должен содержать не менее {MIN_QUESTION_LENGTH} символов.
        </p>
      )}
    </form>
  );
}
