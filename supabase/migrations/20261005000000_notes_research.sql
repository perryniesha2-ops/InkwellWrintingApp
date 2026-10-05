-- Notes & research in the editor sidebar. Extends the Story Bible's existing
-- bible_notes table so notes show up both in the editor and the Story Bible.
--   kind        'note' (free-form) or 'research' (has an optional source link)
--   source_url  where a research note came from
--   chapter_id  optional chapter the note is about (cleared if it's deleted)

alter table public.bible_notes
  add column if not exists kind text not null default 'note',
  add column if not exists source_url text,
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'bible_notes_kind_check') then
    alter table public.bible_notes
      add constraint bible_notes_kind_check check (kind in ('note', 'research'));
  end if;
end $$;

create index if not exists bible_notes_chapter_idx on public.bible_notes (chapter_id);

-- Collaborators: same access as the rest of the Story Bible (helpers from the
-- sharing migration; ids compared as text since bible ids may be text here).
drop policy if exists "bible_notes_members_select" on public.bible_notes;
create policy "bible_notes_members_select" on public.bible_notes
  for select using (can_view_bible(bible_id::text));
drop policy if exists "bible_notes_members_write" on public.bible_notes;
create policy "bible_notes_members_write" on public.bible_notes
  for all using (can_edit_bible(bible_id::text)) with check (can_edit_bible(bible_id::text));
