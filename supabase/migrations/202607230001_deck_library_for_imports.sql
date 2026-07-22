create extension if not exists "pgcrypto";

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  basic_user text,
  title text not null,
  purpose text,
  audience text,
  mode text not null default 'image' check (mode in ('image', 'html')),
  template_id text,
  settings jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'generating', 'review', 'completed', 'failed')),
  slide_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.slides (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  page_no integer not null,
  section text,
  title text not null,
  summary text,
  body text,
  speaker_notes text,
  layout_type text,
  html_content text,
  css_content text,
  image_url text,
  prompt text,
  status text not null default 'pending' check (status in ('pending', 'generating', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deck_id, page_no)
);

alter table public.decks
  add column if not exists basic_user text,
  add column if not exists settings jsonb not null default '{}'::jsonb;

create index if not exists decks_basic_user_updated_at_idx
  on public.decks (basic_user, updated_at desc);

create index if not exists slides_deck_page_idx
  on public.slides (deck_id, page_no);

alter table public.decks enable row level security;
alter table public.slides enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'imported-slide-images',
  'imported-slide-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

