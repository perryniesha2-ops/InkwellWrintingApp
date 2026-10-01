-- Guidance text for chapters created from an outline template (e.g. what the
-- "Midpoint" beat should accomplish). Shown on corkboard cards and above the
-- editor until the writer dismisses it.
alter table public.chapters
  add column if not exists guidance text not null default '';
