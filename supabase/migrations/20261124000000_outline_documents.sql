-- Outlines uploaded to the Story Bible as Word documents (.docx). The file is
-- converted to HTML in the browser and kept as written (headings, lists,
-- tables), so it can be read beside the manuscript in the editor.
--   content     the converted HTML (sanitized again whenever it's shown)
--   file_name   the uploaded file's name; replacing the outline updates it

create table if not exists public.outline_documents (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id     uuid default auth.uid() references auth.users(id) on delete set null,
  title       text not null default 'Outline',
  file_name   text,
  content     text not null default '',
  word_count  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists outline_documents_document_idx on public.outline_documents (document_id, created_at);

alter table public.outline_documents enable row level security;

-- Same access as the rest of the book: anyone who can open it can read its
-- outlines; the owner and whole-book collaborators can add and change them.
drop policy if exists "outline_documents_select" on public.outline_documents;
create policy "outline_documents_select" on public.outline_documents
  for select using (can_view_document(document_id));

drop policy if exists "outline_documents_insert" on public.outline_documents;
create policy "outline_documents_insert" on public.outline_documents
  for insert with check (can_edit_document(document_id));

drop policy if exists "outline_documents_update" on public.outline_documents;
create policy "outline_documents_update" on public.outline_documents
  for update using (can_edit_document(document_id)) with check (can_edit_document(document_id));

drop policy if exists "outline_documents_delete" on public.outline_documents;
create policy "outline_documents_delete" on public.outline_documents
  for delete using (can_edit_document(document_id));
