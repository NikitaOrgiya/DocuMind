import "server-only";
import { getAIProvider } from "@/lib/ai";
import { chunkDocument } from "./chunk";
import type { BackendMatch, RetrievalBackend, SearchOptions } from "./backend";
import { loadCorpus } from "./corpus";
import { normalizeText } from "./normalize";
import { cosineSimilarity } from "./similarity";

interface IndexedChunk {
  id: string;
  documentId: string;
  documentTitle: string;
  documentSource: string;
  content: string;
  section: string | null;
  embedding: number[];
}

let indexPromise: Promise<IndexedChunk[]> | null = null;

async function buildIndex(): Promise<IndexedChunk[]> {
  const provider = getAIProvider();
  const documents = await loadCorpus();
  const indexed: IndexedChunk[] = [];

  for (const doc of documents) {
    const chunks = chunkDocument(normalizeText(doc.rawText));
    const embeddings = await provider.embed(chunks.map((c) => c.content));
    chunks.forEach((chunk, i) => {
      indexed.push({
        id: `${doc.slug}-${chunk.chunkIndex}`,
        documentId: doc.slug,
        documentTitle: doc.title,
        documentSource: doc.filePath,
        content: chunk.content,
        section: chunk.section,
        embedding: embeddings[i],
      });
    });
  }

  return indexed;
}

/**
 * Reproduces the pgvector retrieval RPC in-process, over the demo corpus,
 * using the mock provider's hashed embeddings. See lib/ai/mock-provider.ts
 * for why this is not a stand-in for real semantic search quality.
 */
export class MockRetrievalBackend implements RetrievalBackend {
  readonly name = "in-memory-mock";

  async search(queryEmbedding: number[], opts: SearchOptions): Promise<BackendMatch[]> {
    if (!indexPromise) {
      indexPromise = buildIndex();
    }
    const index = await indexPromise;

    return index
      .map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        documentSource: chunk.documentSource,
        content: chunk.content,
        section: chunk.section,
        pageNumber: null as number | null,
        similarity: cosineSimilarity(queryEmbedding, chunk.embedding),
      }))
      .filter((match) => match.similarity >= opts.matchThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, opts.matchCount);
  }
}
