import { Sparkles } from "lucide-react";
import { SuggestedQuestions } from "./suggested-questions";

export function EmptyState({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Ask DocuMind anything</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Answers are grounded in the indexed knowledge base — network operations, workstation
          support, access management, backup recovery, and incident response — with cited
          sources. Questions outside that scope are declined rather than guessed at.
        </p>
      </div>
      <div className="w-full">
        <SuggestedQuestions onSelect={onSelect} />
      </div>
    </div>
  );
}
