import "server-only";
import { getAIProvider } from "@/lib/ai";
import {
  aiProvider,
  assertRealProviderConfigured,
  config,
  EXPECTED_EMBEDDING_DIMENSIONS,
  useMock,
} from "@/lib/config";
import type { SourceCard } from "@/types/domain";
import type { RetrievalBackend } from "./backend";
import { MockRetrievalBackend } from "./mock-backend";
import { mapMatchesToSources } from "./source-mapping";
import { SupabaseRetrievalBackend } from "./supabase-backend";

let cachedBackend: RetrievalBackend | null = null;

function getRetrievalBackend(): RetrievalBackend {
  if (!cachedBackend) {
    assertRealProviderConfigured();
    cachedBackend = useMock ? new MockRetrievalBackend() : new SupabaseRetrievalBackend();
  }
  return cachedBackend;
}

/**
 * Catches a provider/schema mismatch (e.g. DOCUMIND_AI_PROVIDER=openai
 * against a database migrated for Ollama's 768-dim vectors) as a clear
 * app-level error before it reaches pgvector, instead of a cryptic
 * Postgres "different vector dimensions" failure.
 */
function assertEmbeddingDimension(vector: number[]): void {
  const expected = EXPECTED_EMBEDDING_DIMENSIONS[aiProvider];
  if (expected !== undefined && vector.length !== expected) {
    throw new Error(
      `Embedding dimension mismatch: DOCUMIND_AI_PROVIDER="${aiProvider}" produced a ` +
        `${vector.length}-dimensional vector, but the database schema expects ${expected}. ` +
        "Check DOCUMIND_AI_PROVIDER against the migration your local Supabase was reset with, " +
        "or re-run the migration matching this provider (see README \"Vector dimension\")."
    );
  }
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
  assertEmbeddingDimension(queryEmbedding);
  const matches = await backend.search(queryEmbedding, {
    matchThreshold: config.rag.matchThreshold,
    matchCount: config.rag.matchCount,
  });

  const sources = mapMatchesToSources(matches);

  return { sources, isSufficient: sources.length > 0, backend: backend.name };
}
