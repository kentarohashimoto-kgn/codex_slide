create table if not exists public.public_shares (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  basic_user text not null,
  deck_id text not null,
  title text not null,
  deck_snapshot jsonb not null,
  ad_config jsonb not null default '{"kind":"none"}'::jsonb,
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.share_view_events (
  id uuid primary key default gen_random_uuid(),
  share_token text not null references public.public_shares(token) on delete cascade,
  event_type text not null check (event_type in ('page_view', 'page_duration', 'ad_click')),
  page_no integer not null default 1,
  viewer_id text,
  viewer_label text,
  metadata jsonb not null default '{}'::jsonb,
  user_agent text,
  referrer text,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists public_shares_basic_user_idx on public.public_shares(basic_user, updated_at desc);
create index if not exists share_view_events_share_token_idx on public.share_view_events(share_token, created_at desc);
create index if not exists share_view_events_page_idx on public.share_view_events(share_token, page_no);

alter table public.public_shares enable row level security;
alter table public.share_view_events enable row level security;
