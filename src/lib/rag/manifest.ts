// No "server-only" guard, matching corpus.ts/chunk.ts/normalize.ts, which
// this wraps — it touches node:fs transitively via loadCorpus() and would
// fail to bundle into a client component anyway.
import { chunkDocument } from "./chunk";
import { loadCorpus } from "./corpus";
import { normalizeText } from "./normalize";

export interface DocumentSectionSummary {
  heading: string;
  excerpt: string;
}

export interface DocumentSummary {
  slug: string;
  title: string;
  description: string;
  sectionCount: number;
}

export interface DocumentDetail extends DocumentSummary {
  sections: DocumentSectionSummary[];
}

const DESCRIPTION_MAX_CHARS = 220;

/**
 * Single source of truth for "what documents/sections exist" outside of
 * ingestion and retrieval — built from the same loadCorpus() + chunkDocument()
 * pipeline scripts/ingest and the mock backend already use, so the sidebar
 * count and the Documents browser can never drift from what's actually
 * indexed.
 */
async function buildCatalog(): Promise<DocumentDetail[]> {
  const documents = await loadCorpus();

  return documents.map((doc) => {
    const chunks = chunkDocument(normalizeText(doc.rawText));
    const bySection = new Map<string, string[]>();
    for (const chunk of chunks) {
      const heading = chunk.section ?? doc.title;
      if (!bySection.has(heading)) bySection.set(heading, []);
      bySection.get(heading)!.push(chunk.content);
    }

    const sections: DocumentSectionSummary[] = [...bySection.entries()].map(
      ([heading, contents]) => ({ heading, excerpt: contents.join("\n\n") })
    );

    const firstParagraph = sections[0]?.excerpt.split(/\n\s*\n/)[0]?.trim() ?? "";
    const description =
      firstParagraph.length > DESCRIPTION_MAX_CHARS
        ? `${firstParagraph.slice(0, DESCRIPTION_MAX_CHARS).trimEnd()}…`
        : firstParagraph;

    return {
      slug: doc.slug,
      title: doc.title,
      description,
      sectionCount: sections.length,
      sections,
    };
  });
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const catalog = await buildCatalog();
  return catalog.map((doc) => ({
    slug: doc.slug,
    title: doc.title,
    description: doc.description,
    sectionCount: doc.sectionCount,
  }));
}

export async function getDocumentBySlug(slug: string): Promise<DocumentDetail | null> {
  const catalog = await buildCatalog();
  return catalog.find((doc) => doc.slug === slug) ?? null;
}

/** Cheap count for the sidebar — avoids the full chunk-and-section build above. */
export async function getDocumentCount(): Promise<number> {
  const documents = await loadCorpus();
  return documents.length;
}
