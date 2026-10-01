-- Chapters & subchapters as first-class rows.
-- documents.content is kept as the compiled manuscript (written by the editor
-- on every save) so exports and manuscript-level AI keep working unchanged.

create table if not exists public.chapters (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  parent_id   uuid references public.chapters(id) on delete cascade,
  title       text not null default 'Untitled Chapter',
  content     text not null default '',
  synopsis    text not null default '',
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists chapters_document_idx on public.chapters (document_id, parent_id, order_index);

-- Set once a document's legacy content has been split into chapters, so two
-- concurrent first loads can't both seed it.
alter table public.documents
  add column if not exists chapters_seeded boolean not null default false;

alter table public.chapters enable row level security;

-- documents.user_id is stored as text in this project, so ownership checks
-- compare as text (works for text or uuid columns).
drop policy if exists "chapters_owner_all" on public.chapters;
create policy "chapters_owner_all" on public.chapters
  for all
  using (
    exists (select 1 from public.documents d where d.id = chapters.document_id and d.user_id::text = auth.uid()::text)
  )
  with check (
    exists (select 1 from public.documents d where d.id = chapters.document_id and d.user_id::text = auth.uid()::text)
  );
