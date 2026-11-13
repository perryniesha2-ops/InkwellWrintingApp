-- AI plot & continuity checks of a manuscript.
--
-- A check reads the whole book (and the Story Bible) in three passes run in
-- parallel: plot, continuity & timeline, and characters & world. It runs on
-- the server after the request returns; the editor polls this row.
--   status        running -> done | failed
--   progress      { passes: { <pass>: { state, phase?, error? } } }
--   result        { passes: { <pass>: { summary, issues[], threads[] } } }
--   issue_states  { <issue id>: "fixed" | "dismissed" } as the author works through it

create table if not exists public.plot_checks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.documents(id) on delete cascade,
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  scope        text not null check (scope in ('book', 'chapter')),
  -- For scope = 'chapter': the chapter the check focuses on (no FK, see the
  -- comments migration: restoring a revision re-inserts chapters).
  chapter_id   uuid,
  status       text not null default 'running' check (status in ('running', 'done', 'failed')),
  progress     jsonb not null default '{}'::jsonb,
  result       jsonb,
  issue_states jsonb not null default '{}'::jsonb,
  error        text,
  word_count   integer not null default 0,
  model        text,
  created_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index if not exists plot_checks_document_idx on public.plot_checks (document_id, created_at desc);

alter table public.plot_checks enable row level security;

-- The owner and whole-book collaborators (the people who can see every chapter).
drop policy if exists "plot_checks_all" on public.plot_checks;
create policy "plot_checks_all" on public.plot_checks
  for all using (can_edit_document(document_id)) with check (can_edit_document(document_id));
