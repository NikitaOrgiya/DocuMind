import { forwardRef, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Deliberately chrome-less (no border/rounded/own focus ring/background) —
 * the one call site (ChatComposer) supplies all of that on a wrapping
 * container instead, so the textarea and its send button read as a single
 * unified input bar rather than two separately-bordered controls sitting
 * next to each other.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        "w-full resize-none bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "Textarea";
