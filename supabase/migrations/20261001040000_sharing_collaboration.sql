-- Sharing + live collaboration.
--
-- * share_links: tokens for read-only links (no account needed) and edit
--   invites (collaborator signs in and is added to document_members).
--   A link covers the whole book (chapter_id null) or one chapter + its scenes.
-- * document_members: collaborators who can edit the whole book or one chapter.
-- * Access helpers + additive RLS policies (existing owner policies untouched).
-- * Yjs storage for live editing: chapters.ydoc snapshot + chapter_updates log.
-- * documents.content (compiled manuscript) is maintained by a trigger, since a
--   chapter-scoped collaborator can't see — and must not overwrite — the rest.

-- ── Tables ─────────────────────────────────────────────────────────────────

create table if not exists public.share_links (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique,
  document_id uuid not null references public.documents(id) on delete cascade,
  chapter_id  uuid references public.chapters(id) on delete cascade,
  role        text not null check (role in ('view', 'edit')),
  created_by  uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);
create index if not exists share_links_document_idx on public.share_links (document_id);

create table if not exists public.document_members (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- null = whole book; otherwise this chapter and its subchapters.
  chapter_id  uuid references public.chapters(id) on delete cascade,
  role        text not null default 'edit' check (role in ('edit')),
  email       text,
  created_at  timestamptz not null default now()
);
create unique index if not exists document_members_unique
  on public.document_members (document_id, user_id, coalesce(chapter_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists document_members_user_idx on public.document_members (user_id);

alter table public.chapters
  add column if not exists ydoc text,                      -- base64 Yjs snapshot
  add column if not exists ydoc_upto bigint not null default 0, -- last update id merged into ydoc
  add column if not exists ydoc_seeded boolean not null default false;

create table if not exists public.chapter_updates (
  id         bigserial primary key,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  "update"   text not null,                               -- base64 Yjs update
  created_at timestamptz not null default now()
);
create index if not exists chapter_updates_chapter_idx on public.chapter_updates (chapter_id, id);

-- ── Access helpers (SECURITY DEFINER so policies can consult other tables) ──
-- Comparisons against pre-existing tables (documents.user_id, the Story Bible
-- tables' ids) are done as text, since some of those columns are text here.

create or replace function public.is_document_owner(p_document_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from documents where id = p_document_id and user_id::text = auth.uid()::text);
$$;

create or replace function public.can_view_document(p_document_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_document_owner(p_document_id)
      or exists (select 1 from document_members where document_id = p_document_id and user_id = auth.uid());
$$;

-- Whole-book collaborators (and the owner) can change the book's structure.
create or replace function public.can_edit_document(p_document_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select is_document_owner(p_document_id)
      or exists (select 1 from document_members
                 where document_id = p_document_id and user_id = auth.uid() and chapter_id is null);
$$;

-- Takes the row's own columns rather than looking the chapter up: policies on
-- chapters run while a new row is being inserted, when it isn't visible yet.
create or replace function public.can_edit_chapter_row(p_document_id uuid, p_chapter_id uuid, p_parent_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select can_edit_document(p_document_id)
      or exists (select 1 from document_members m
                 where m.document_id = p_document_id and m.user_id = auth.uid()
                   and m.chapter_id in (p_chapter_id, p_parent_id));
$$;

-- For tables that reference an existing chapter (e.g. chapter_updates).
create or replace function public.can_edit_chapter(p_chapter_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from chapters c
    where c.id = p_chapter_id and can_edit_chapter_row(c.document_id, c.id, c.parent_id)
  );
$$;

create or replace function public.can_view_bible(p_bible_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from story_bibles b where b.id::text = p_bible_id and can_view_document(b.document_id::text::uuid));
$$;

create or replace function public.can_edit_bible(p_bible_id text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from story_bibles b where b.id::text = p_bible_id and can_edit_document(b.document_id::text::uuid));
$$;

-- ── Policies ───────────────────────────────────────────────────────────────

-- documents: collaborators can read; whole-book collaborators can rename.
drop policy if exists "documents_members_select" on public.documents;
create policy "documents_members_select" on public.documents
  for select using (can_view_document(id));
drop policy if exists "documents_members_update" on public.documents;
create policy "documents_members_update" on public.documents
  for update using (can_edit_document(id)) with check (can_edit_document(id));

-- chapters: replaces the owner-only policy from the chapters migration.
drop policy if exists "chapters_owner_all" on public.chapters;
drop policy if exists "chapters_select" on public.chapters;
create policy "chapters_select" on public.chapters
  for select using (can_edit_chapter_row(document_id, id, parent_id));
drop policy if exists "chapters_insert" on public.chapters;
create policy "chapters_insert" on public.chapters
  for insert with check (can_edit_document(document_id));
drop policy if exists "chapters_update" on public.chapters;
create policy "chapters_update" on public.chapters
  for update using (can_edit_chapter_row(document_id, id, parent_id))
  with check (can_edit_chapter_row(document_id, id, parent_id));
drop policy if exists "chapters_delete" on public.chapters;
create policy "chapters_delete" on public.chapters
  for delete using (can_edit_document(document_id));

alter table public.chapter_updates enable row level security;
drop policy if exists "chapter_updates_all" on public.chapter_updates;
create policy "chapter_updates_all" on public.chapter_updates
  for all using (can_edit_chapter(chapter_id)) with check (can_edit_chapter(chapter_id));

alter table public.share_links enable row level security;
drop policy if exists "share_links_owner" on public.share_links;
create policy "share_links_owner" on public.share_links
  for all using (is_document_owner(document_id)) with check (is_document_owner(document_id));

alter table public.document_members enable row level security;
drop policy if exists "document_members_owner" on public.document_members;
create policy "document_members_owner" on public.document_members
  for all using (is_document_owner(document_id)) with check (is_document_owner(document_id));
drop policy if exists "document_members_self_select" on public.document_members;
create policy "document_members_self_select" on public.document_members
  for select using (user_id = auth.uid());
drop policy if exists "document_members_self_delete" on public.document_members;
create policy "document_members_self_delete" on public.document_members
  for delete using (user_id = auth.uid());

-- Story Bible: collaborators read; whole-book collaborators edit.
drop policy if exists "story_bibles_members_select" on public.story_bibles;
create policy "story_bibles_members_select" on public.story_bibles
  for select using (can_view_document(document_id::text::uuid));

drop policy if exists "characters_members_select" on public.characters;
create policy "characters_members_select" on public.characters
  for select using (can_view_bible(bible_id::text));
drop policy if exists "characters_members_write" on public.characters;
create policy "characters_members_write" on public.characters
  for all using (can_edit_bible(bible_id::text)) with check (can_edit_bible(bible_id::text));

drop policy if exists "world_entries_members_select" on public.world_entries;
create policy "world_entries_members_select" on public.world_entries
  for select using (can_view_bible(bible_id::text));
drop policy if exists "world_entries_members_write" on public.world_entries;
create policy "world_entries_members_write" on public.world_entries
  for all using (can_edit_bible(bible_id::text)) with check (can_edit_bible(bible_id::text));

-- ── Share link functions ───────────────────────────────────────────────────

-- Read-only content for a view (or edit) link. Callable without signing in.
create or replace function public.get_shared(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  l share_links;
  d documents;
begin
  select * into l from share_links where token = p_token and revoked_at is null;
  if not found then return null; end if;
  select * into d from documents where id = l.document_id;
  return jsonb_build_object(
    'role', l.role,
    'documentId', d.id,
    'chapterId', l.chapter_id,
    'title', d.title,
    'chapters', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', c.id, 'parentId', c.parent_id, 'title', c.title, 'content', c.content)
             order by coalesce(p.order_index, c.order_index), coalesce(c.parent_id, c.id),
                      case when c.parent_id is null then -1 else c.order_index end)
      from chapters c left join chapters p on p.id = c.parent_id
      where c.document_id = d.id
        and (l.chapter_id is null or l.chapter_id in (c.id, c.parent_id))
    ), '[]'::jsonb)
  );
end;
$$;

-- Accept an edit invite: adds the signed-in user as a collaborator.
create or replace function public.accept_share(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  l share_links;
begin
  if auth.uid() is null then raise exception 'Sign in required'; end if;
  select * into l from share_links where token = p_token and revoked_at is null;
  if not found then raise exception 'This link is no longer valid'; end if;
  if l.role <> 'edit' then raise exception 'This link is view-only'; end if;
  if not exists (select 1 from documents where id = l.document_id and user_id::text = auth.uid()::text) then
    insert into document_members (document_id, user_id, chapter_id, email)
    values (l.document_id, auth.uid(), l.chapter_id, (select email from auth.users where id = auth.uid()))
    on conflict do nothing;
  end if;
  return jsonb_build_object('documentId', l.document_id, 'chapterId', l.chapter_id);
end;
$$;

grant execute on function public.get_shared(text) to anon, authenticated;
grant execute on function public.accept_share(text) to authenticated;

-- ── Compiled manuscript, maintained by the database ────────────────────────

create or replace function public.recompile_document(p_document_id uuid)
returns void language sql volatile security definer set search_path = public as $$
  with ordered as (
    select c.*,
           case when c.parent_id is null then 1 else 2 end as lvl,
           coalesce(p.order_index, c.order_index) as top_order,
           coalesce(c.parent_id, c.id) as top_id,
           case when c.parent_id is null then -1 else c.order_index end as sub_order
    from chapters c left join chapters p on p.id = c.parent_id
    where c.document_id = p_document_id
  ),
  compiled as (
    select coalesce(string_agg(
             format('<h%s>%s</h%s>%s', lvl,
                    replace(replace(replace(title, '&', '&amp;'), '<', '&lt;'), '>', '&gt;'),
                    lvl, content),
             '' order by top_order, top_id, sub_order), '') as html
    from ordered
  )
  update documents d
     set content = compiled.html,
         word_count = (select count(*) from regexp_matches(regexp_replace(compiled.html, '<[^>]+>', ' ', 'g'), '\S+', 'g')),
         updated_at = now()
    from compiled
   where d.id = p_document_id;
$$;

create or replace function public.chapters_recompile_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE'
     and new.title is not distinct from old.title
     and new.content is not distinct from old.content
     and new.parent_id is not distinct from old.parent_id
     and new.order_index is not distinct from old.order_index then
    return null; -- synopsis/guidance/ydoc-only changes don't affect the manuscript
  end if;
  perform recompile_document(coalesce(new.document_id, old.document_id));
  return null;
end;
$$;

drop trigger if exists chapters_recompile on public.chapters;
create trigger chapters_recompile
  after insert or update or delete on public.chapters
  for each row execute function public.chapters_recompile_trigger();

-- Restores replace a chapter's rows, so drop any live-editing state with them.
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
     set title = coalesce(r.snapshot ->> 'title', title),
         chapters_seeded = true,
         updated_at = now()
   where id = r.document_id;
end;
$$;
