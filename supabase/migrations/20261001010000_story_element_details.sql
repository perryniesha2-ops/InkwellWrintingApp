-- Every story element (characters + world entries such as locations, themes,
-- items) gets photos, a description, notes and history.
--   characters:    images, description, notes, backstory (= history)
--   world_entries: images, content (= description), notes, history

alter table public.characters
  add column if not exists images text[] not null default '{}',
  add column if not exists description text;

alter table public.world_entries
  add column if not exists images text[] not null default '{}',
  add column if not exists notes text;
