-- Enable pgvector
create extension if not exists vector;

-- Workspaces belong to a user (auth.users comes from Supabase Auth)
create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  created_at timestamptz default now()
);

-- Documents uploaded into a workspace
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces not null,
  filename text not null,
  content_hash text not null,       -- sha256 of raw file bytes, for idempotent re-upload
  created_at timestamptz default now(),
  unique (workspace_id, content_hash)
);

-- Single shared chunk table for ALL workspaces.
-- workspace_id is the isolation boundary and MUST be part of every
-- similarity query's WHERE clause -- never filtered after the fact.
create table if not exists chunks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces not null,
  document_id uuid references documents not null,
  content text not null,
  embedding vector(768),            -- match your embedding model's dimension
  chunk_index int not null,
  created_at timestamptz default now()
);

create index if not exists chunks_embedding_idx
  on chunks using ivfflat (embedding vector_cosine_ops) with (lists = 100);

create index if not exists chunks_workspace_idx
  on chunks (workspace_id);

-- Tool call log, per workspace
create table if not exists tool_calls (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces not null,
  tool_name text not null,
  arguments jsonb not null,
  result jsonb,
  status text not null check (status in ('success', 'error')),
  created_at timestamptz default now()
);

-- Tasks created via the save_task tool
create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces not null,
  title text not null,
  description text,
  created_at timestamptz default now()
);

-- Chat history, per workspace
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  citations jsonb,
  created_at timestamptz default now()
);
