import "server-only";
import { getAIProvider } from "@/lib/ai";
import { config, useMock } from "@/lib/config";
import type { SourceCard } from "@/types/domain";
import type { RetrievalBackend } from "./backend";
import { MockRetrievalBackend } from "./mock-backend";
import { mapMatchesToSources } from "./source-mapping";
import { SupabaseRetrievalBackend } from "./supabase-backend";

let cachedBackend: RetrievalBackend | null = null;

function getRetrievalBackend(): RetrievalBackend {
  if (!cachedBackend) {
    cachedBackend = useMock ? new MockRetrievalBackend() : new SupabaseRetrievalBackend();
  }
  return cachedBackend;
}

export interface RetrievalResult {
  sources: SourceCard[];
  isSufficient: boolean;
  backend: string;
}

/**
 * Embeds the question, runs semantic search, and assigns local S1..SN
 * citation labels in similarity order. Never returns database UUIDs to
 * callers — see README.md "Citation validation" for why.
 */
export async function retrieveSources(question: string): Promise<RetrievalResult> {
  const provider = getAIProvider();
  const backend = getRetrievalBackend();

  const [queryEmbedding] = await provider.embed([question]);
  const matches = await backend.search(queryEmbedding, {
    matchThreshold: config.rag.matchThreshold,
    matchCount: config.rag.matchCount,
  });

  const sources = mapMatchesToSources(matches);

  return { sources, isSufficient: sources.length > 0, backend: backend.name };
}
