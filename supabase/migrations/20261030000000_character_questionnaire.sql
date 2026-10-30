-- Character Discovery Questionnaire answers, per character.
--   { "startedAt": iso timestamp, "answers": { "<item id>": text } }
-- Item ids are defined in src/lib/characterQuestionnaire.ts.

alter table public.characters
  add column if not exists questionnaire jsonb not null default '{}'::jsonb;
