-- Image clippings on notes (newspaper screenshots, photos, scans).
-- Each attachment: { "url": text, "path": text, "name": text, "caption": text }
-- Files live in the existing "world-images" storage bucket under
-- <user id>/notes/<note id>/…

alter table public.bible_notes
  add column if not exists attachments jsonb not null default '[]'::jsonb;
