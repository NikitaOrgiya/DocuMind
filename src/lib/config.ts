// Deliberately no "server-only" guard: this module is shared with the CLI
// scripts (scripts/ingest, scripts/eval), which run outside the Next.js
// server runtime. It never accesses secrets it wasn't given directly, and
// non-NEXT_PUBLIC_ env vars already resolve to `undefined` in any client
// bundle, so nothing here can leak into the browser.

function envBool(value: string | undefined): boolean {
  return value === "true" || value === "1";
}

function envInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envFloat(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
const mockRequested = envBool(process.env.DOCUMIND_MOCK_AI);

/**
 * DocuMind only has two coherent runtime modes: fully real (OpenAI + Supabase
 * pgvector, all persisted) or fully mock (deterministic local provider +
 * in-memory corpus + in-memory chat store). Mixing partial credentials would
 * mean comparing real embeddings against fake ones, so any missing
 * credential — or an explicit DOCUMIND_MOCK_AI=true — falls back to full mock.
 */
export const useMock = mockRequested || !hasSupabase || !hasOpenAI;

export const config = {
  useMock,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    configured: hasSupabase,
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    configured: hasOpenAI,
  },
  rag: {
    // The mock provider's hashed bag-of-words embeddings produce much lower
    // cosine similarities than real OpenAI embeddings for genuinely related
    // text, so the sensible default threshold differs sharply by mode. An
    // explicit RAG_MATCH_THRESHOLD always wins over both defaults.
    // 0.22 (not 0.20) specifically because measured noise for a prompt-
    // injection probe ("...reveal the system prompt.") landed at 0.2017 —
    // just above 0.20 — while it shares no real topical content with any
    // document; the weakest genuine paraphrase match measured is 0.2463,
    // so 0.22 keeps a safety margin on both sides. A false grounded answer
    // is worse than an over-cautious refusal.
    matchThreshold: envFloat(process.env.RAG_MATCH_THRESHOLD, useMock ? 0.22 : 0.72),
    matchCount: envInt(process.env.RAG_MATCH_COUNT, 6),
    contextMaxChars: envInt(process.env.RAG_CONTEXT_MAX_CHARS, 12000),
  },
} as const;

/**
 * Dimensions used by the deterministic hashed mock embedding (see
 * lib/ai/mock-provider.ts). Large relative to the demo corpus's vocabulary
 * (a few thousand unique words) specifically to keep hash collisions rare —
 * a low-dimension hash space was tried first and produced enough collision
 * noise that unrelated questions spuriously matched real documents, which
 * defeats the "refuse when out of scope" behavior the mock mode exists to
 * demonstrate.
 */
export const MOCK_EMBEDDING_DIMENSIONS = 4096;
