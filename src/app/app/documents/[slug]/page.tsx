import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { getDocumentBySlug } from "@/lib/rag/manifest";

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = await getDocumentBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Link
          href="/app/documents"
          className="inline-flex items-center gap-1.5 text-sm text-neutral-500 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          База знаний
        </Link>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold text-neutral-900">{doc.title}</h1>
          <Badge>Демонстрационный документ</Badge>
        </div>
        <p className="mt-1 text-sm text-neutral-500">{doc.description}</p>

        <div className="mt-6 flex flex-col gap-6">
          {doc.sections.map((section) => (
            <div key={section.heading}>
              <h2 className="text-sm font-semibold text-neutral-900">{section.heading}</h2>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-neutral-600">
                {section.excerpt}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
