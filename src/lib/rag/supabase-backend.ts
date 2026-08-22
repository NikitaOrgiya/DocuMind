import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server-client";
import type { BackendMatch, RetrievalBackend, SearchOptions } from "./backend";

interface SearchRpcRow {
  chunk_id: string;
  document_id: string;
  document_title: string;
  document_source: string | null;
  content: string;
  section: string | null;
  page_number: number | null;
  similarity: number;
}

export class SupabaseRetrievalBackend implements RetrievalBackend {
  readonly name = "supabase-pgvector";

  async search(queryEmbedding: number[], opts: SearchOptions): Promise<BackendMatch[]> {
    const client = getSupabaseServerClient();
    const { data, error } = await client.rpc("search_document_chunks", {
      query_embedding: queryEmbedding,
      match_threshold: opts.matchThreshold,
      match_count: opts.matchCount,
    });

    if (error) {
      throw new Error(`Supabase retrieval RPC failed: ${error.message}`);
    }

    return ((data ?? []) as SearchRpcRow[]).map((row) => ({
      id: row.chunk_id,
      documentId: row.document_id,
      documentTitle: row.document_title,
      documentSource: row.document_source,
      content: row.content,
      section: row.section,
      pageNumber: row.page_number,
      similarity: row.similarity,
    }));
  }
}
