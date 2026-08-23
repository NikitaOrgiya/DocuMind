/**
 * npm run ingest
 *
 * Populates Supabase/pgvector from docs/sample-corpus. This is a standalone
 * CLI script (run with tsx, not inside the Next.js server runtime), so it
 * intentionally does NOT import the app's server-only-guarded modules
 * (lib/ai/openai-provider.ts, lib/ai/ollama-provider.ts,
 * lib/supabase/server-client.ts) — the "server-only" package throws
 * unconditionally outside Next's react-server bundling condition. It builds
 * its own thin Supabase client and reuses the pure logic modules (corpus
 * loading, normalization, chunking, config, and — for Ollama — the shared
 * lib/ai/ollama-client.ts, which is itself not server-only-guarded).
 *
 * Provider-aware: DOCUMIND_AI_PROVIDER selects "ollama" (real local
 * embeddings, no external calls, no API key) or "openai" (real OpenAI
 * embeddings). "mock" isn't meaningful here — mock mode has no database.
 *
 * Idempotent: re-running upserts each document by slug, deletes its
 * existing chunks, and rebuilds them — it never accumulates duplicates.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { embedWithOllama } from "../../src/lib/ai/ollama-client";
import { chunkDocument } from "../../src/lib/rag/chunk";
import { config, EXPECTED_EMBEDDING_DIMENSIONS } from "../../src/lib/config";
import { loadCorpus } from "../../src/lib/rag/corpus";
import { logger } from "../../src/lib/logging/logger";
import { normalizeText } from "../../src/lib/rag/normalize";

const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

const SENSITIVE_KEY_PATTERN = /key|token|auth|secret|cookie|password/i;

/**
 * Supabase/Postgres errors, plain JS errors, and raw fetch failures all
 * surface differently here — printing `error?.message` alone silently
 * prints the literal string "undefined" whenever the thrown value doesn't
 * have that shape (e.g. a wrapped network/parse failure), hiding the real
 * cause. This renders whatever fields are actually present, and redacts
 * anything that looks like a credential if a raw object ever needs a
 * fallback JSON dump.
 */
function describeError(error: unknown): string {
  if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const known = ["message", "code", "details", "hint", "name", "status", "statusCode"] as const;
    const parts = known
      .filter((key) => record[key] !== undefined && record[key] !== null && record[key] !== "")
      .map((key) => `${key}=${JSON.stringify(record[key])}`);

    if (parts.length > 0) {
      return parts.join(" ");
    }

    // No recognizable error fields at all — fall back to a redacted dump
    // so at least the shape of the failure is visible, never its secrets.
    try {
      const redacted = JSON.stringify(record, (key, value) =>
        SENSITIVE_KEY_PATTERN.test(key) ? "[redacted]" : value
      );
      return `unrecognized error shape: ${redacted}`;
    } catch {
      return `unrecognized, non-serializable error (constructor: ${error.constructor?.name ?? "unknown"})`;
    }
  }

  return String(error);
}

// Re-read after loadEnv, since lib/config.ts's `process.env.*` reads happen
// at module import time, before dotenv had a chance to populate them here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const provider = config.aiProvider === "mock" ? "ollama" : config.aiProvider;
const openaiApiKey = process.env.OPENAI_API_KEY;
const embeddingModel =
  provider === "ollama"
    ? process.env.OLLAMA_EMBEDDING_MODEL || config.ollama.embeddingModel
    : process.env.OPENAI_EMBEDDING_MODEL || config.openai.embeddingModel;

async function embed(texts: string[]): Promise<number[][]> {
  if (provider === "ollama") {
    return embedWithOllama(config.ollama.baseUrl, embeddingModel, texts);
  }
  const openai = new OpenAI({ apiKey: openaiApiKey! });
  const response = await openai.embeddings.create({ model: embeddingModel, input: texts });
  return response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

async function main() {
  if (!supabaseUrl || !supabaseServiceKey) {
    console.log(
      "SKIPPED — missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local or .env. " +
        "The rest of DocuMind still builds and runs in local mock mode without these."
    );
    process.exit(0);
  }
  if (provider === "openai" && !openaiApiKey) {
    console.log("SKIPPED — DOCUMIND_AI_PROVIDER=openai but OPENAI_API_KEY is missing.");
    process.exit(0);
  }

  console.log(`Ingesting with provider="${provider}", embedding model="${embeddingModel}".`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const documents = await loadCorpus();
  let totalChunks = 0;
  const expectedDimension = EXPECTED_EMBEDDING_DIMENSIONS[provider];

  for (const doc of documents) {
    logger.info("ingest.document_started", { slug: doc.slug });

    const { data: documentRow, error: upsertError } = await supabase
      .from("documents")
      .upsert(
        {
          slug: doc.slug,
          title: doc.title,
          source: "DocuMind sample corpus",
          file_path: doc.filePath,
          is_active: true,
        },
        { onConflict: "slug" }
      )
      .select()
      .single();

    if (upsertError || !documentRow) {
      console.error(`Failed to upsert document "${doc.slug}": ${describeError(upsertError)}`);
      process.exit(1);
    }

    const { error: deleteError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentRow.id);

    if (deleteError) {
      console.error(`Failed to clear existing chunks for "${doc.slug}": ${describeError(deleteError)}`);
      process.exit(1);
    }

    const chunks = chunkDocument(normalizeText(doc.rawText));
    if (chunks.length === 0) {
      console.error(`Document "${doc.slug}" produced zero chunks — aborting.`);
      process.exit(1);
    }

    let embeddings: number[][];
    try {
      embeddings = await embed(chunks.map((c) => c.content));
    } catch (error) {
      logger.error("ingest.embedding_failed", {
        slug: doc.slug,
        provider,
        reason: error instanceof Error ? error.message : "unknown",
      });
      process.exit(1);
    }

    if (expectedDimension !== undefined && embeddings[0]?.length !== expectedDimension) {
      console.error(
        `Embedding dimension mismatch: provider "${provider}" (model "${embeddingModel}") produced ` +
          `${embeddings[0]?.length ?? 0}-dimensional vectors, but the database schema expects ${expectedDimension}. ` +
          "Check DOCUMIND_AI_PROVIDER against the migration your local Supabase was reset with."
      );
      process.exit(1);
    }

    const rows = chunks.map((chunk, i) => ({
      document_id: documentRow.id,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      section: chunk.section,
      page_number: null,
      embedding: embeddings[i],
    }));

    const { error: insertError } = await supabase.from("document_chunks").insert(rows);
    if (insertError) {
      console.error(`Failed to insert chunks for "${doc.slug}": ${describeError(insertError)}`);
      process.exit(1);
    }

    totalChunks += chunks.length;
    logger.info("ingest.document_completed", { slug: doc.slug, chunkCount: chunks.length });
  }

  logger.info("ingest.run_completed", { documentCount: documents.length, chunkCount: totalChunks });
  console.log(`Ingested ${documents.length} documents / ${totalChunks} chunks.`);
}

main().catch((error) => {
  console.error("Ingestion failed:", describeError(error));
  process.exit(1);
});
