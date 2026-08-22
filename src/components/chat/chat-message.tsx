import { AlertCircle, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { ChatMessageRecord } from "@/types/domain";
import { SourceCard } from "./source-card";

export function ChatMessageBubble({ message }: { message: ChatMessageRecord }) {
  const isUser = message.role === "user";
  const isRefusal = !isUser && message.retrievalSuccess === false;

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600"
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>

      <div className={cn("flex max-w-[75%] flex-col gap-2", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isUser
              ? "bg-neutral-900 text-white"
              : isRefusal
                ? "border border-amber-200 bg-amber-50 text-amber-900"
                : "border border-neutral-200 bg-white text-neutral-900"
          )}
        >
          {isRefusal && (
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
              <AlertCircle className="h-3.5 w-3.5" />
              Not found in the knowledge base
            </div>
          )}
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm prose-neutral max-w-none prose-p:my-1.5 prose-ul:my-1.5">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>

        {!isUser && message.sources.length > 0 && (
          <div className="w-full">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-neutral-400">
              Sources
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {message.sources.map((source) => (
                <SourceCard key={source.id} source={source} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
