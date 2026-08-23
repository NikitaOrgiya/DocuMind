/**
 * npm run eval:rag
 *
 * Runs evals/rag-eval.json against the real Supabase pipeline, with either
 * Ollama (local, default) or OpenAI as the embedding + generation
 * provider, selected via DOCUMIND_AI_PROVIDER ("mock" falls back to
 * "ollama" — live evaluation is meaningless without a real provider). Like
 * scripts/ingest, this is a standalone CLI script and does not import the
 * app's server-only-guarded modules — it builds its own thin Supabase
 * client and reuses the pure RAG logic (context building, prompt, citation
 * validation, structured-answer schema, and — for Ollama — the shared,
 * non-server-only lib/ai/ollama-client.ts).
 *
 * This is intentionally NOT part of `npm run test`. If Supabase/provider
 * credentials are missing, it reports SKIPPED rather than a fake PASS.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { createClient } from "@supabase/supabase-js";
import { generateWithOllama, embedWithOllama } from "../../src/lib/ai/ollama-client";
import { config } from "../../src/lib/config";
import { validateCitations } from "../../src/lib/rag/citations";
import { buildContext } from "../../src/lib/rag/context";
import { SYSTEM_PROMPT, buildUserPrompt } from "../../src/lib/rag/prompt";
import { structuredAnswerSchema } from "../../src/lib/validation/ai-response";
import type { SourceCard } from "../../src/types/domain";
import evalCases from "../../evals/rag-eval.json";

const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const provider = config.aiProvider === "mock" ? "ollama" : config.aiProvider;
const openaiApiKey = process.env.OPENAI_API_KEY;
const chatModel =
  provider === "ollama"
    ? process.env.OLLAMA_CHAT_MODEL || config.ollama.chatModel
    : process.env.OPENAI_CHAT_MODEL || config.openai.chatModel;
const embeddingModel =
  provider === "ollama"
    ? process.env.OLLAMA_EMBEDDING_MODEL || config.ollama.embeddingModel
    : process.env.OPENAI_EMBEDDING_MODEL || config.openai.embeddingModel;
const matchThreshold = Number.parseFloat(process.env.RAG_MATCH_THRESHOLD || (provider === "ollama" ? "0.65" : "0.72"));
const matchCount = Number.parseInt(process.env.RAG_MATCH_COUNT || "6", 10);

async function embedOne(text: string): Promise<number[]> {
  if (provider === "ollama") {
    const [vector] = await embedWithOllama(config.ollama.baseUrl, embeddingModel, [text]);
    return vector;
  }
  const openai = new OpenAI({ apiKey: openaiApiKey! });
  const response = await openai.embeddings.create({ model: embeddingModel, input: text });
  return response.data[0].embedding;
}

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

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log(
      "SKIPPED — missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
        "Live RAG evaluation requires a real retrieval + generation pipeline; it cannot be faked with mocks."
    );
    process.exit(0);
  }
  if (provider === "openai" && !openaiApiKey) {
    console.log("SKIPPED — DOCUMIND_AI_PROVIDER=openai but OPENAI_API_KEY is missing.");
    process.exit(0);
  }

  console.log(
    `Evaluating with provider="${provider}", chat model="${chatModel}", embedding model="${embeddingModel}", ` +
      `threshold=${matchThreshold}, matchCount=${matchCount}.`
  );

  const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });
  const openai = provider === "openai" ? new OpenAI({ apiKey: openaiApiKey! }) : null;
  const responseFormat = zodResponseFormat(structuredAnswerSchema, "documind_answer");

  const cases = evalCases as EvalCase[];
  const results: Array<{ id: string; category: string; pass: boolean; detail: string }> = [];

  for (const testCase of cases) {
    const queryEmbedding = await embedOne(testCase.question);

    const { data, error } = await supabase.rpc("search_document_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
    });

    if (error) {
      results.push({ id: testCase.id, category: testCase.category, pass: false, detail: `retrieval error: ${error.message}` });
      continue;
    }

    const rows = (data ?? []) as RpcRow[];
    const sources: SourceCard[] = rows.map((row, i) => ({
      id: `S${i + 1}`,
      documentTitle: row.document_title,
      documentSource: row.document_source,
      section: row.section,
      pageNumber: row.page_number,
      excerpt: row.content,
      similarity: row.similarity,
    }));

    let retrievalSuccess = sources.length > 0;
    let finalCitations: string[] = [];
    let generationError: string | null = null;
    const retrievedDocs = new Set(sources.map((s) => s.documentTitle));
    const retrievedSections = new Set(sources.map((s) => s.section).filter((s): s is string => !!s));

    if (retrievalSuccess) {
      try {
        const parsed =
          provider === "ollama"
            ? await generateWithOllama(
                config.ollama.baseUrl,
                chatModel,
                testCase.question,
                buildContext(sources)
              )
            : await openai!.chat.completions
                .parse({
                  model: chatModel,
                  messages: [
                    { role: "system", content: SYSTEM_PROMPT },
                    { role: "user", content: buildUserPrompt(testCase.question, buildContext(sources)) },
                  ],
                  response_format: responseFormat,
                  temperature: 0,
                })
                .then((completion) => completion.choices[0]?.message.parsed ?? null);

        if (parsed) {
          const { validCitations, isGrounded } = validateCitations(parsed, sources);
          retrievalSuccess = isGrounded;
          finalCitations = validCitations;
        } else {
          retrievalSuccess = false;
        }
      } catch (error) {
        retrievalSuccess = false;
        generationError = error instanceof Error ? error.message : String(error);
      }
    }

    const actualRefusal = !retrievalSuccess;
    const refusalMatches = actualRefusal === testCase.expectRefusal;

    let documentOverlap = true;
    if (!testCase.expectRefusal && testCase.expectedDocuments.length > 0) {
      documentOverlap = testCase.expectedDocuments.some((doc) => retrievedDocs.has(doc));
    }

    const citationsValid = finalCitations.every((c) => sources.some((s) => s.id === c));

    const pass = refusalMatches && documentOverlap && citationsValid;
    const detail = [
      `refusal: expected=${testCase.expectRefusal} actual=${actualRefusal}`,
      `retrievedDocs=[${[...retrievedDocs].join(", ")}]`,
      `retrievedSections=[${[...retrievedSections].join(", ")}]`,
      `citations=[${finalCitations.join(", ")}]`,
      `citationIntegrity=${citationsValid}`,
      ...(generationError ? [`generationError=${generationError}`] : []),
    ].join(" | ");

    results.push({ id: testCase.id, category: testCase.category, pass, detail });
  }

  console.log("\nDocuMind RAG evaluation\n");
  for (const r of results) {
    console.log(`${r.pass ? "PASS" : "FAIL"}  [${r.category}] ${r.id}`);
    console.log(`      ${r.detail}`);
  }

  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n${passCount}/${results.length} cases passed.`);

  if (passCount !== results.length) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Evaluation failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
