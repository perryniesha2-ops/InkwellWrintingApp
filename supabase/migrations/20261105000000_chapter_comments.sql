-- Proofreading comments on chapter text.
--
-- The commented text carries a `comment` mark in the chapter (rendered as
-- <span data-comment-id="…">), so it moves with edits and syncs through live
-- collaboration. This table holds the comment itself.
--
-- chapter_id deliberately has no foreign key: restoring a revision deletes and
-- re-inserts a book's chapters (same ids), which would cascade and wipe every
-- comment. Comments on a chapter that no longer exists stay visible to whoever
-- can edit the whole book, so they can be cleaned up.

create table if not exists public.chapter_comments (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chapter_id  uuid not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '',
  -- The text that was selected when the comment was made.
  quote       text not null default '',
  body        text not null,
  resolved    boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists chapter_comments_document_idx on public.chapter_comments (document_id, created_at);

alter table public.chapter_comments enable row level security;

-- Anyone who can edit the chapter (owner, whole-book collaborators, and
-- collaborators invited to that chapter) can read, add and resolve comments.
drop policy if exists "chapter_comments_select" on public.chapter_comments;
create policy "chapter_comments_select" on public.chapter_comments
  for select using (can_edit_chapter(chapter_id) or can_edit_document(document_id));

drop policy if exists "chapter_comments_insert" on public.chapter_comments;
create policy "chapter_comments_insert" on public.chapter_comments
  for insert with check (
    user_id = auth.uid()
    and can_edit_chapter(chapter_id)
    and exists (select 1 from public.chapters c where c.id = chapter_id and c.document_id = chapter_comments.document_id)
  );

drop policy if exists "chapter_comments_update" on public.chapter_comments;
create policy "chapter_comments_update" on public.chapter_comments
  for update using (can_edit_chapter(chapter_id) or can_edit_document(document_id))
  with check (can_edit_chapter(chapter_id) or can_edit_document(document_id));

-- Only the comment's author or the book's owner can delete it.
drop policy if exists "chapter_comments_delete" on public.chapter_comments;
create policy "chapter_comments_delete" on public.chapter_comments
  for delete using (user_id = auth.uid() or is_document_owner(document_id));
