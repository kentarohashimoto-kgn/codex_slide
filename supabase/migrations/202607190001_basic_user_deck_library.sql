alter table public.decks
  add column if not exists basic_user text,
  add column if not exists settings jsonb not null default '{}'::jsonb;

create index if not exists decks_basic_user_updated_at_idx
  on public.decks (basic_user, updated_at desc);
