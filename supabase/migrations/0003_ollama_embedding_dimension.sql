-- DocuMind — retarget pgvector for local Ollama embeddings (nomic-embed-text)
--
-- 0001_init.sql declared embedding vector(1536) for OpenAI's
-- text-embedding-3-small. The project's primary free/local workflow is now
-- Ollama's nomic-embed-text — its actual output dimension was measured
-- directly against a live embed request (not assumed from documentation)
-- at 768. This migration retargets the schema to that measured value.
--
-- Any existing document_chunks rows would be for the wrong dimension and
-- unusable regardless (in practice there are none: ingestion never got
-- past the first document before this migration, blocked first by a
-- Supabase config bug, then by an OpenAI quota limit — see git history),
-- so they're cleared here rather than attempted to be cast.

-- The HNSW index depends on the embedding column's type; drop it before
-- changing the column, then recreate it against the new dimension.
drop index if exists document_chunks_embedding_hnsw_idx;

delete from document_chunks;

alter table document_chunks
  alter column embedding type vector(768);

create index document_chunks_embedding_hnsw_idx
  on document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- search_document_chunks's query_embedding parameter type is part of the
-- function's identity/signature in Postgres, so `create or replace` can't
-- change it — drop and recreate instead. Logic is otherwise identical to
-- 0001_init.sql; EXECUTE defaults to PUBLIC for a freshly created
-- function, same as before, so no explicit grant is needed here.
drop function if exists search_document_chunks(vector(1536), float, int);

create function search_document_chunks(
  query_embedding vector(768),
  match_threshold float,
  match_count int
)
returns table (
  chunk_id uuid,
  document_id uuid,
  document_title text,
  document_source text,
  content text,
  section text,
  page_number int,
  similarity float
)
language sql
stable
as $$
  select
    dc.id as chunk_id,
    dc.document_id,
    d.title as document_title,
    d.source as document_source,
    dc.content,
    dc.section,
    dc.page_number,
    1 - (dc.embedding <=> query_embedding) as similarity
  from document_chunks dc
  join documents d on d.id = dc.document_id
  where d.is_active = true
    and dc.embedding is not null
    and 1 - (dc.embedding <=> query_embedding) >= match_threshold
  order by dc.embedding <=> query_embedding
  limit greatest(least(match_count, 50), 1);
$$;
