import { Sparkles } from "lucide-react";
import { LoadingIndicator } from "./loading-indicator";
import { SuggestedQuestions } from "./suggested-questions";

export function EmptyState({
  onSelect,
  loading,
}: {
  onSelect: (question: string) => void;
  loading: boolean;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-1 flex-col items-center justify-center gap-6 px-4 pb-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Sparkles className="h-6 w-6" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">Задайте DocuMind вопрос</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-neutral-500">
          Ответы основаны на проиндексированной базе знаний — сетевые операции, поддержка
          рабочих станций, управление доступом, резервное копирование и реагирование на
          инциденты — со ссылками на источники. На вопросы вне этой темы даётся отказ, а не
          выдуманный ответ.
        </p>
      </div>
      {loading ? (
        <LoadingIndicator />
      ) : (
        <div className="w-full">
          <SuggestedQuestions onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}
