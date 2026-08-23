/**
 * npm run eval:retrieval
 *
 * Measures retrieval quality ONLY — no chat-completion calls — against the
 * real OpenAI embeddings + Supabase pgvector RPC. Exists so
 * RAG_MATCH_THRESHOLD can be calibrated from real similarity scores without
 * spending LLM tokens on every run; `npm run eval:rag` (full generation)
 * is the more expensive companion script.
 *
 * For every case in evals/rag-eval.json, it asks search_document_chunks for
 * the top 10 matches with match_threshold=0 (i.e. unfiltered, ranked by
 * similarity only) so the actual score distribution is visible, then:
 *   - for answerable cases, checks whether an expectedDocuments hit lands in
 *     the top-1/top-3/top-5;
 *   - for refusal-expected cases (out-of-scope / prompt-injection), records
 *     the highest similarity found — that's the "noise ceiling" a threshold
 *     must sit above.
 * It then prints a small sweep table over candidate thresholds so the
 * actual tradeoff (recall on answerable cases vs. false positives on
 * out-of-scope cases) is visible before picking one.
 *
 * Like scripts/ingest and scripts/eval, this is a standalone CLI script and
 * does not import the app's server-only-guarded modules (see those scripts
 * for why) — it builds its own thin Supabase client and reuses the shared,
 * non-server-only lib/ai/ollama-client.ts for Ollama.
 *
 * Provider-aware via DOCUMIND_AI_PROVIDER ("ollama" or "openai"; "mock"
 * falls back to "ollama" since retrieval calibration is meaningless
 * without a real embedding model).
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { embedWithOllama } from "../../src/lib/ai/ollama-client";
import { config } from "../../src/lib/config";
import evalCases from "../../evals/rag-eval.json";

const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const provider = config.aiProvider === "mock" ? "ollama" : config.aiProvider;
const openaiApiKey = process.env.OPENAI_API_KEY;
const embeddingModel =
  provider === "ollama"
    ? process.env.OLLAMA_EMBEDDING_MODEL || config.ollama.embeddingModel
    : process.env.OPENAI_EMBEDDING_MODEL || config.openai.embeddingModel;

async function embedOne(text: string): Promise<number[]> {
  if (provider === "ollama") {
    const [vector] = await embedWithOllama(config.ollama.baseUrl, embeddingModel, [text]);
    return vector;
  }
  const openai = new OpenAI({ apiKey: openaiApiKey! });
  const response = await openai.embeddings.create({ model: embeddingModel, input: text });
  return response.data[0].embedding;
}

const RAW_TOP_K = 10;
const CANDIDATE_THRESHOLDS = [0.5, 0.55, 0.6, 0.65, 0.7, 0.72, 0.75, 0.8, 0.85];

interface EvalCase {
  id: string;
  category: string;
  question: string;
  expectedDocuments: string[];
  expectedSections: string[];
  expectRefusal: boolean;
  notes?: string;
}

interface RpcRow {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_source: string | null;
  content: string;
  section: string | null;
  page_number: number | null;
  similarity: number;
}

interface CaseResult {
  id: string;
  category: string;
  expectRefusal: boolean;
  expectedDocuments: string[];
  topMatches: RpcRow[];
  hitRank: number | null; // 1-indexed rank of the first expected-document hit, or null
  topSimilarity: number | null;
}

function hitRank(matches: RpcRow[], expectedDocuments: string[]): number | null {
  if (expectedDocuments.length === 0) return null;
  for (let i = 0; i < matches.length; i++) {
    if (expectedDocuments.includes(matches[i].document_title)) return i + 1;
  }
  return null;
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log(
      "SKIPPED — missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
        "Retrieval calibration requires a real pgvector index; it cannot be measured with mocks."
    );
    process.exit(0);
  }
  if (provider === "openai" && !openaiApiKey) {
    console.log("SKIPPED — DOCUMIND_AI_PROVIDER=openai but OPENAI_API_KEY is missing.");
    process.exit(0);
  }

  console.log(`Evaluating retrieval with provider="${provider}", embedding model="${embeddingModel}".`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  const cases = evalCases as EvalCase[];
  const results: CaseResult[] = [];

  for (const testCase of cases) {
    const queryEmbedding = await embedOne(testCase.question);

    const { data, error } = await supabase.rpc("search_document_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: 0,
      match_count: RAW_TOP_K,
    });

    if (error) {
      console.error(`Retrieval error on ${testCase.id}: ${error.message}`);
      process.exit(1);
    }

    const matches = (data ?? []) as RpcRow[];
    results.push({
      id: testCase.id,
      category: testCase.category,
      expectRefusal: testCase.expectRefusal,
      expectedDocuments: testCase.expectedDocuments,
      topMatches: matches,
      hitRank: hitRank(matches, testCase.expectedDocuments),
      topSimilarity: matches.length > 0 ? matches[0].similarity : null,
    });
  }

  console.log("\nDocuMind retrieval-only evaluation\n");
  for (const r of results) {
    const top3 = r.topMatches
      .slice(0, 3)
      .map((m) => `${m.similarity.toFixed(4)} ${m.document_title}`)
      .join(" | ");
    console.log(
      `[${r.category}] ${r.id}  expectRefusal=${r.expectRefusal}  hitRank=${r.hitRank ?? "-"}  top3: ${top3 || "(none)"}`
    );
  }

  const answerable = results.filter((r) => !r.expectRefusal && r.expectedDocuments.length > 0);
  const refusalCases = results.filter((r) => r.expectRefusal);

  const hitRate = (n: number) =>
    answerable.length === 0
      ? 0
      : answerable.filter((r) => r.hitRank !== null && r.hitRank <= n).length / answerable.length;

  console.log("\n--- Aggregate (answerable cases, unfiltered top-10) ---");
  console.log(`answerable cases: ${answerable.length}`);
  console.log(`Top-1 hit rate: ${(hitRate(1) * 100).toFixed(0)}%`);
  console.log(`Top-3 hit rate: ${(hitRate(3) * 100).toFixed(0)}%`);
  console.log(`Top-5 hit rate: ${(hitRate(5) * 100).toFixed(0)}%`);

  console.log("\n--- Threshold sweep ---");
  console.log("threshold | answerable recall (top-1 sim >= threshold AND correct doc) | out-of-scope false-positive rate");
  for (const threshold of CANDIDATE_THRESHOLDS) {
    const recall =
      answerable.length === 0
        ? 0
        : answerable.filter(
            (r) => r.hitRank === 1 && (r.topSimilarity ?? 0) >= threshold
          ).length / answerable.length;
    const falsePositiveRate =
      refusalCases.length === 0
        ? 0
        : refusalCases.filter((r) => (r.topSimilarity ?? 0) >= threshold).length / refusalCases.length;
    console.log(
      `${threshold.toFixed(2)}      | ${(recall * 100).toFixed(0)}%`.padEnd(45) +
        `| ${(falsePositiveRate * 100).toFixed(0)}%`
    );
  }

  console.log(
    "\nNote: recall above requires the top-1 match to already be the correct document — " +
      "a real threshold choice should also consider hitRank 2/3 for multi-source questions. " +
      "Re-run npm run eval:rag with a candidate threshold to see full end-to-end behavior."
  );
}

main().catch((error) => {
  console.error("Retrieval evaluation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
