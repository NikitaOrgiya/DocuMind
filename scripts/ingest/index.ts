/**
 * npm run ingest
 *
 * Populates Supabase/pgvector from docs/sample-corpus. This is a standalone
 * CLI script (run with tsx, not inside the Next.js server runtime), so it
 * intentionally does NOT import the app's server-only-guarded modules
 * (lib/ai/openai-provider.ts, lib/supabase/server-client.ts) — the
 * "server-only" package throws unconditionally outside Next's
 * react-server bundling condition. It builds its own thin OpenAI/Supabase
 * clients instead and reuses only the pure logic modules (corpus loading,
 * normalization, chunking, config).
 *
 * Idempotent: re-running upserts each document by slug, deletes its
 * existing chunks, and rebuilds them — it never accumulates duplicates.
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadEnv } from "dotenv";
import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import { chunkDocument } from "../../src/lib/rag/chunk";
import { config } from "../../src/lib/config";
import { loadCorpus } from "../../src/lib/rag/corpus";
import { logger } from "../../src/lib/logging/logger";
import { normalizeText } from "../../src/lib/rag/normalize";

const envLocalPath = path.join(process.cwd(), ".env.local");
loadEnv({ path: existsSync(envLocalPath) ? envLocalPath : path.join(process.cwd(), ".env") });

// Re-read after loadEnv, since lib/config.ts's `process.env.*` reads happen
// at module import time, before dotenv had a chance to populate them here.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;
const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL || config.openai.embeddingModel;

async function main() {
  if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
    console.log(
      "SKIPPED — missing external credentials (need NEXT_PUBLIC_SUPABASE_URL, " +
        "SUPABASE_SERVICE_ROLE_KEY, and OPENAI_API_KEY in .env.local or .env). " +
        "The rest of DocuMind still builds and runs in local mock mode without these."
    );
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });
  const openai = new OpenAI({ apiKey: openaiApiKey });

  const documents = await loadCorpus();
  let totalChunks = 0;

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
      console.error(`Failed to upsert document "${doc.slug}": ${upsertError?.message}`);
      process.exit(1);
    }

    const { error: deleteError } = await supabase
      .from("document_chunks")
      .delete()
      .eq("document_id", documentRow.id);

    if (deleteError) {
      console.error(`Failed to clear existing chunks for "${doc.slug}": ${deleteError.message}`);
      process.exit(1);
    }

    const chunks = chunkDocument(normalizeText(doc.rawText));
    if (chunks.length === 0) {
      console.error(`Document "${doc.slug}" produced zero chunks — aborting.`);
      process.exit(1);
    }

    let embeddings: number[][];
    try {
      const response = await openai.embeddings.create({
        model: embeddingModel,
        input: chunks.map((c) => c.content),
      });
      embeddings = response.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    } catch (error) {
      logger.error("ingest.embedding_failed", {
        slug: doc.slug,
        reason: error instanceof Error ? error.message : "unknown",
      });
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
      console.error(`Failed to insert chunks for "${doc.slug}": ${insertError.message}`);
      process.exit(1);
    }

    totalChunks += chunks.length;
    logger.info("ingest.document_completed", { slug: doc.slug, chunkCount: chunks.length });
  }

  logger.info("ingest.run_completed", { documentCount: documents.length, chunkCount: totalChunks });
  console.log(`Ingested ${documents.length} documents / ${totalChunks} chunks.`);
}

main().catch((error) => {
  console.error("Ingestion failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
