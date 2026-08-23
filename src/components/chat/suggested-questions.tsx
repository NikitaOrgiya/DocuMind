/**
 * The mock retrieval backend is a lexical, English-oriented bag-of-words
 * matcher (see lib/ai/mock-provider.ts) — it has no real multilingual
 * understanding. So each suggestion shows a Russian label (what the demo
 * question is "about"), but clicking it submits the canonical English
 * query the demo corpus actually matches — that's also what appears in
 * the chat transcript and gets embedded for retrieval. This is
 * deliberately transparent rather than faking multilingual RAG: nothing
 * is translated behind the scenes, the query that runs is the query you
 * see get asked.
 */
export interface SuggestedQuestion {
  id: string;
  label: string;
  query: string;
}

export const SUGGESTED_QUESTIONS: SuggestedQuestion[] = [
  {
    id: "escalation",
    label: "Как происходит эскалация критических сетевых инцидентов?",
    query: "What is the escalation process for a critical network incident?",
  },
  {
    id: "privileged-access",
    label: "Когда нужно пересматривать привилегированный доступ?",
    query: "When must privileged access be reviewed?",
  },
  {
    id: "server-restore",
    label: "Какие шаги нужны перед восстановлением сервера после сбоя?",
    query: "What steps are required before restoring a failed server?",
  },
  {
    id: "workstation-backups",
    label: "Как часто проверяются резервные копии рабочих станций?",
    query: "How often are workstation backups verified?",
  },
];

export function SuggestedQuestions({ onSelect }: { onSelect: (question: string) => void }) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {SUGGESTED_QUESTIONS.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onSelect(suggestion.query)}
          title={suggestion.query}
          className="rounded-lg border border-neutral-200 bg-white px-4 py-3 text-left text-sm text-neutral-700 transition-colors hover:border-accent/40 hover:bg-accent/5"
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}
