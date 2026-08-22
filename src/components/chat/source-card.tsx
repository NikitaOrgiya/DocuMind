import { FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { SourceCard as SourceCardType } from "@/types/domain";

export function SourceCard({ source }: { source: SourceCardType }) {
  return (
    <Card className="min-w-[240px] max-w-[280px] shrink-0 p-3">
      <div className="flex items-start gap-2">
        <FileText className="mt-0.5 h-4 w-4 shrink-0 text-neutral-400" />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">{source.documentTitle}</p>
          {source.section ? (
            <p className="truncate text-xs text-neutral-500">Section: {source.section}</p>
          ) : null}
          {source.pageNumber != null ? (
            <p className="text-xs text-neutral-500">Page {source.pageNumber}</p>
          ) : null}
        </div>
      </div>
      <p className="mt-2 line-clamp-4 text-xs italic text-neutral-500">&ldquo;{source.excerpt}&rdquo;</p>
    </Card>
  );
}
