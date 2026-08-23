// Deliberately no "server-only" guard: this module is shared with the CLI
// scripts (scripts/ingest, scripts/eval), which run outside the Next.js
// server runtime. It never accesses secrets it wasn't given directly, and
// non-NEXT_PUBLIC_ env vars already resolve to `undefined` in any client
// bundle, so nothing here can leak into the browser.

export type AIProviderKind = "mock" | "ollama" | "openai";

function envInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function envFloat(value: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat(value ?? "");
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveAIProvider(): AIProviderKind {
  const raw = (process.env.DOCUMIND_AI_PROVIDER ?? "").trim().toLowerCase();
  // Unset -> mock: the same safe, zero-setup default as before this
  // three-way selector existed. DOCUMIND_MOCK_AI (the old binary flag) is
  // no longer read — DOCUMIND_AI_PROVIDER is the single source of truth,
  // so there's exactly one place that decides the mode, not two that could
  // disagree.
  if (raw === "") return "mock";
  if (raw === "mock" || raw === "ollama" || raw === "openai") return raw;
  throw new Error(
    `Invalid DOCUMIND_AI_PROVIDER "${raw}" — expected "mock", "ollama", or "openai".`
  );
}

export const aiProvider: AIProviderKind = resolveAIProvider();

const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);

/**
 * True only in mock mode. Ollama and OpenAI are both "real" providers that
 * need the real Supabase/pgvector backend — the in-memory store and corpus
 * only exist to make mock mode independently runnable with zero setup.
 */
export const useMock = aiProvider === "mock";

/**
 * DOCUMIND_AI_PROVIDER picks the mode explicitly; this catches the case
 * where it points at a real provider but that provider's credentials
 * aren't actually present, so the failure is a clear message here instead
 * of a cryptic error deep in a Supabase/OpenAI client constructed with an
 * empty string. Call from every provider/backend/store factory, not just
 * one, since any of them can be the first one instantiated.
 */
export function assertRealProviderConfigured(): void {
  if (aiProvider === "mock") return;
  if (!hasSupabase) {
    throw new Error(
      `DOCUMIND_AI_PROVIDER="${aiProvider}" requires a real Supabase backend, but ` +
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY aren't both set. " +
        "Set DOCUMIND_AI_PROVIDER=mock to run without them, or configure local Supabase (see README)."
    );
  }
  if (aiProvider === "openai" && !hasOpenAI) {
    throw new Error(
      'DOCUMIND_AI_PROVIDER="openai" requires OPENAI_API_KEY to be set. ' +
        "Set DOCUMIND_AI_PROVIDER=mock or =ollama instead, or configure an OpenAI API key."
    );
  }
  // Ollama needs no credential — OLLAMA_BASE_URL always resolves to a
  // usable default (see config.ollama.baseUrl below), so there's nothing
  // further to assert for it here.
}

// The mock provider's hashed bag-of-words embeddings produce much lower
// cosine similarities than real embeddings for genuinely related text, and
// Ollama's nomic-embed-text and OpenAI's text-embedding-3-small don't
// necessarily land on the same similarity scale as each other either — so
// the sensible default threshold is measured and set per provider. An
// explicit RAG_MATCH_THRESHOLD always wins over all of these.
const DEFAULT_MATCH_THRESHOLD: Record<AIProviderKind, number> = {
  // 0.22 (not 0.20): measured noise for a prompt-injection probe ("...reveal
  // the system prompt.") landed at 0.2017 — just above 0.20 — while sharing
  // no real topical content with any document; the weakest genuine
  // paraphrase match measured was 0.2463. 0.22 keeps margin on both sides.
  mock: 0.22,
  // Measured via `npm run eval:retrieval` against real nomic-embed-text +
  // pgvector (20-case local eval set): the noise ceiling across all 4
  // refusal-expected cases (3 out-of-scope + 1 prompt-injection) was
  // 0.5343; recall on the 16 answerable cases stayed flat at 94% (0% false
  // positives) across the entire 0.55–0.70 range, only dropping at 0.72+.
  // 0.65 sits in the middle of that plateau — solid margin above the
  // measured noise ceiling without giving up any recall the plateau
  // already has. See README "pgvector retrieval" for the full sweep table.
  ollama: 0.65,
  // Reasoned default; not yet measured against real OpenAI embeddings (see
  // README "Known limitations") — a false grounded answer is worse than an
  // over-cautious refusal, so this leans conservative until measured.
  openai: 0.72,
};

export const config = {
  useMock,
  aiProvider,
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    configured: hasSupabase,
  },
  ollama: {
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    chatModel: process.env.OLLAMA_CHAT_MODEL || "qwen3:4b",
    embeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || "nomic-embed-text",
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY ?? "",
    chatModel: process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini",
    embeddingModel: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small",
    configured: hasOpenAI,
  },
  rag: {
    matchThreshold: envFloat(process.env.RAG_MATCH_THRESHOLD, DEFAULT_MATCH_THRESHOLD[aiProvider]),
    matchCount: envInt(process.env.RAG_MATCH_COUNT, 6),
    contextMaxChars: envInt(process.env.RAG_CONTEXT_MAX_CHARS, 12000),
  },
} as const;

/**
 * Expected pgvector column dimension for each real provider's embedding
 * model — must match supabase/migrations' `vector(N)` declaration exactly.
 * Ollama's nomic-embed-text dimension (768) was measured directly against
 * a live embed request, not assumed from documentation; OpenAI's
 * text-embedding-3-small dimension (1536) is per OpenAI's docs (unverified
 * against a live call — OpenAI ingestion hasn't been run in this project,
 * see README "Known limitations"). Used by lib/rag/retrieval.ts to catch a
 * provider/schema mismatch as a clear app error instead of a cryptic
 * Postgres failure.
 */
export const EXPECTED_EMBEDDING_DIMENSIONS: Partial<Record<AIProviderKind, number>> = {
  ollama: 768,
  openai: 1536,
};

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
