-- Proofreader suggestions the author rejected, so later passes don't suggest
-- them again. `key` fingerprints the edit and the text around it (see
-- editKey in src/lib/proofread.ts); editing that text lets it come back.
--
-- chapter_id has no foreign key: restoring a revision re-inserts chapters
-- (see the comments migration).

create table if not exists public.proofread_ignores (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chapter_id  uuid not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  key         text not null,
  original    text not null default '',
  replacement text not null default '',
  created_at  timestamptz not null default now()
);

create unique index if not exists proofread_ignores_key_idx on public.proofread_ignores (chapter_id, key);

alter table public.proofread_ignores enable row level security;

-- Anyone who can edit the chapter shares its list of rejected suggestions.
drop policy if exists "proofread_ignores_all" on public.proofread_ignores;
create policy "proofread_ignores_all" on public.proofread_ignores
  for all using (can_edit_chapter(chapter_id) or can_edit_document(document_id))
  with check (can_edit_chapter(chapter_id) or can_edit_document(document_id));
