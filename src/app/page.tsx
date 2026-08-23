import { BookOpenCheck, History, Link2, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Семантический поиск",
    description: "Вопросы сопоставляются со смыслом документа, а не только с ключевыми словами, через pgvector.",
  },
  {
    icon: BookOpenCheck,
    title: "Retrieval-augmented generation",
    description: "Ответы строятся строго из фрагментов, которые реально нашёл поиск.",
  },
  {
    icon: Link2,
    title: "Ответы со ссылками на источники",
    description: "Каждое утверждение ведёт обратно к документу и разделу, из которого оно взято.",
  },
  {
    icon: ShieldCheck,
    title: "Устойчивость к галлюцинациям",
    description: "Нет релевантного контекста — значит явный отказ, а не выдуманный ответ.",
  },
  {
    icon: History,
    title: "История диалогов",
    description: "Прошлые вопросы, ответы и их источники сохраняются между сессиями.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-neutral-200">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-sm font-semibold tracking-tight text-neutral-900">DocuMind</span>
          <Link
            href="/app"
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
          >
            Открыть DocuMind
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto max-w-3xl px-6 py-24 text-center">
          <p className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-500">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Retrieval-augmented, с проверкой источников
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl">
            DocuMind
          </h1>
          <p className="mt-3 text-lg text-neutral-600">
            AI-ассистент по технической документации
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-neutral-500">
            DocuMind отвечает только на основе подготовленной, заранее проиндексированной базы
            документов и точно показывает, какие фрагменты использовал. Если ответа нет в базе
            знаний, он честно об этом говорит вместо того, чтобы угадывать.
          </p>
          <div className="mt-8 flex justify-center">
            <Link
              href="/app"
              className="rounded-lg bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-neutral-700"
            >
              Открыть DocuMind
            </Link>
          </div>
        </section>

        <section className="border-t border-neutral-200 bg-neutral-50/60">
          <div className="mx-auto grid max-w-5xl grid-cols-1 gap-6 px-6 py-16 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="rounded-xl border border-neutral-200 bg-white p-5">
                <feature.icon className="h-5 w-5 text-accent" />
                <h3 className="mt-3 text-sm font-semibold text-neutral-900">{feature.title}</h3>
                <p className="mt-1 text-sm text-neutral-500">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-neutral-200 px-6 py-6 text-center text-xs text-neutral-400">
        DocuMind — портфолио-проект. База документов — фиксированный синтетический демо-корпус.
      </footer>
    </div>
  );
}
