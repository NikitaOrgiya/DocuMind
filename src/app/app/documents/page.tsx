import { FileText } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { pluralizeRu } from "@/lib/i18n/pluralize-ru";
import { listDocuments } from "@/lib/rag/manifest";

export default async function DocumentsPage() {
  const documents = await listDocuments();

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-lg font-semibold text-neutral-900">База знаний</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {documents.length} демонстрационных документов, проиндексированных для локального
          mock-режима DocuMind.
        </p>

        <div className="mt-6 flex flex-col gap-3">
          {documents.map((doc) => (
            <Link key={doc.slug} href={`/app/documents/${doc.slug}`}>
              <Card className="p-4 transition-colors hover:border-accent/40 hover:bg-accent/5">
                <div className="flex items-start gap-3">
                  <FileText className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-neutral-900">{doc.title}</p>
                      <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">
                        Индексирован
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">{doc.description}</p>
                    <p className="mt-2 text-xs text-neutral-400">
                      {doc.sectionCount} {pluralizeRu(doc.sectionCount, "раздел", "раздела", "разделов")} ·
                      Демонстрационный документ
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
