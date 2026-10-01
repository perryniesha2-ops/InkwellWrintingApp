-- Revision history: full snapshots of a book (all chapters + title).
--   kind = 'auto'    taken every 10 minutes while writing (skipped if unchanged)
--          'manual'  saved by the writer, usually with a name
--          'backup'  taken automatically right before a restore

create table if not exists public.revisions (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text,
  kind         text not null default 'auto' check (kind in ('auto', 'manual', 'backup')),
  -- { "title": text, "chapters": [{ id, parent_id, title, content, synopsis, guidance, order_index }] }
  snapshot     jsonb not null,
  -- Compiled manuscript HTML, for previews and for documents.content on restore.
  manuscript   text not null default '',
  word_count   integer not null default 0,
  content_hash text not null,
  created_at   timestamptz not null default now()
);

create index if not exists revisions_document_idx on public.revisions (document_id, created_at desc);

alter table public.revisions enable row level security;

drop policy if exists "revisions_owner_all" on public.revisions;
create policy "revisions_owner_all" on public.revisions
  for all
  using (
    exists (select 1 from public.documents d where d.id = revisions.document_id and d.user_id::text = auth.uid()::text)
  )
  with check (
    exists (select 1 from public.documents d where d.id = revisions.document_id and d.user_id::text = auth.uid()::text)
  );

-- Replace a document's chapters with a revision's snapshot, atomically.
-- SECURITY INVOKER: the caller's RLS policies apply to every statement.
create or replace function public.restore_revision(p_revision_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  r public.revisions;
begin
  select * into r from public.revisions where id = p_revision_id;
  if not found then
    raise exception 'Revision not found';
  end if;

  delete from public.chapters where document_id = r.document_id;

  insert into public.chapters
    (id, document_id, user_id, parent_id, title, content, synopsis, guidance, order_index)
  select c.id, r.document_id, auth.uid(), c.parent_id, coalesce(c.title, ''), coalesce(c.content, ''),
         coalesce(c.synopsis, ''), coalesce(c.guidance, ''), coalesce(c.order_index, 0)
  from jsonb_to_recordset(r.snapshot -> 'chapters') as c(
    id uuid, parent_id uuid, title text, content text, synopsis text, guidance text, order_index int
  )
  order by (c.parent_id is not null);

  update public.documents
     set content = r.manuscript,
         word_count = r.word_count,
         title = coalesce(r.snapshot ->> 'title', title),
         chapters_seeded = true,
         updated_at = now()
   where id = r.document_id;
end;
$$;
