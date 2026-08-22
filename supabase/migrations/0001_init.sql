-- DocuMind — initial schema
-- pgvector-backed document store, chat history, and the semantic search RPC.
-- Embedding dimension (1536) must match OPENAI_EMBEDDING_MODEL's output —
-- see README "Vector dimension" before changing either.

create extension if not exists vector;
create extension if not exists pgcrypto;

-- documents ------------------------------------------------------------

create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source text,
  file_path text not null,
  description text,
  slug text unique,
  is_active boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- document_chunks --------------------------------------------------------

create table if not exists document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  chunk_index integer not null,
  content text not null,
  page_number integer,
  section text,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

-- The unique(document_id, chunk_index) constraint above already creates a
-- covering btree index for document_id + chunk_index lookups, so no
-- duplicate index is added here.

-- HNSW index for cosine-distance ANN search. Requires pgvector >= 0.5.0
-- (Supabase-managed Postgres ships a recent enough version).
create index if not exists document_chunks_embedding_hnsw_idx
  on document_chunks
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- chat_sessions ------------------------------------------------------------

create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Single-user/demo MVP: no auth model, sessions aren't scoped to a user yet.
  user_id uuid,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_updated_at_idx
  on chat_sessions (updated_at desc);

-- chat_messages ------------------------------------------------------------

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  -- Validated SourceCard[] snapshot, so sources survive a reload without re-querying pgvector.
  sources jsonb not null default '[]'::jsonb,
  model text,
  retrieval_success boolean,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_session_created_idx
  on chat_messages (session_id, created_at);

-- Semantic search RPC --------------------------------------------------------

create or replace function search_document_chunks(
  query_embedding vector(1536),
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

-- Row Level Security --------------------------------------------------------
-- No client-side table access is used by the app (all reads/writes go
-- through the server using the service role key), so RLS is enabled with no
-- permissive policies: the anon/authenticated roles get zero direct access
-- and document_chunks can never become an accidental public API.

alter table documents enable row level security;
alter table document_chunks enable row level security;
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
