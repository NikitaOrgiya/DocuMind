export const SUGGESTED_QUESTIONS = [
  "What is the escalation process for a critical network incident?",
  "When must privileged access be reviewed?",
  "What steps are required before restoring a failed server?",
  "How often are workstation backups verified?",
] as const;

export function SuggestedQuestions({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTED_QUESTIONS.map((question) => (
        <button
          key={question}
          type="button"
          onClick={() => onSelect(question)}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          {question}
        </button>
      ))}
    </div>
  );
}
