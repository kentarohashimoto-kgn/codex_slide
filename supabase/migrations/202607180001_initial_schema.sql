create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  description text,
  mode_support text[] not null default array['image', 'html'],
  palette jsonb not null default '{}'::jsonb,
  typography jsonb not null default '{}'::jsonb,
  visual_rules jsonb not null default '[]'::jsonb,
  html_tokens jsonb not null default '{}'::jsonb,
  layout_types jsonb not null default '[]'::jsonb,
  negative_rules jsonb not null default '[]'::jsonb,
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.decks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  title text not null,
  purpose text,
  audience text,
  mode text not null check (mode in ('image', 'html')),
  template_id text,
  status text not null default 'draft' check (status in ('draft', 'generating', 'review', 'completed', 'failed')),
  slide_count integer not null default 18,
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

create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid references public.decks(id) on delete cascade,
  slide_id uuid references public.slides(id) on delete cascade,
  job_type text not null check (job_type in ('outline', 'image', 'html', 'pptx')),
  status text not null default 'queued' check (status in ('queued', 'running', 'succeeded', 'failed')),
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  deck_id uuid not null references public.decks(id) on delete cascade,
  format text not null check (format in ('pptx', 'pdf', 'html')),
  file_url text,
  status text not null default 'generating' check (status in ('generating', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.templates enable row level security;
alter table public.decks enable row level security;
alter table public.slides enable row level security;
alter table public.generation_jobs enable row level security;
alter table public.exports enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "templates_select_available" on public.templates
  for select using (is_public or auth.uid() = user_id);

create policy "templates_modify_own" on public.templates
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "decks_select_own" on public.decks
  for select using (auth.uid() = user_id);

create policy "decks_modify_own" on public.decks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "slides_select_own_deck" on public.slides
  for select using (
    exists (
      select 1 from public.decks
      where decks.id = slides.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "slides_modify_own_deck" on public.slides
  for all using (
    exists (
      select 1 from public.decks
      where decks.id = slides.deck_id
      and decks.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.decks
      where decks.id = slides.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "jobs_select_own_deck" on public.generation_jobs
  for select using (
    exists (
      select 1 from public.decks
      where decks.id = generation_jobs.deck_id
      and decks.user_id = auth.uid()
    )
  );

create policy "exports_select_own_deck" on public.exports
  for select using (
    exists (
      select 1 from public.decks
      where decks.id = exports.deck_id
      and decks.user_id = auth.uid()
    )
  );

