-- RAG embeddings storage and search helpers
-- Requires: pgvector extension enabled in the Supabase project

create extension if not exists vector;

create table if not exists public.rag_chunks (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id text not null,
  chunk_index int not null default 0,
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding vector(1536) not null,
  created_at timestamptz not null default now()
);

create unique index if not exists rag_chunks_source_key
  on public.rag_chunks (source_type, source_id, chunk_index);

create index if not exists rag_chunks_embedding_idx
  on public.rag_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create or replace function public.match_rag_chunks(
  query_embedding vector(1536),
  match_count int,
  filter_source_type text default null
)
returns table (
  id uuid,
  source_type text,
  source_id text,
  chunk_index int,
  content text,
  metadata jsonb,
  similarity float
)
language sql
stable
as $$
  select
    id,
    source_type,
    source_id,
    chunk_index,
    content,
    metadata,
    1 - (embedding <=> query_embedding) as similarity
  from public.rag_chunks
  where filter_source_type is null or source_type = filter_source_type
  order by embedding <=> query_embedding
  limit match_count;
$$;
