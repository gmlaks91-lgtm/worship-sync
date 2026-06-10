-- =============================================================================
-- WorshipSync — profiles, songs, setlists, setlist_songs
-- Supabase SQL Editor에 붙여넣어 한 번에 실행하세요.
-- =============================================================================

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (auth.users 와 1:1)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  role text not null default 'member' check (role in ('leader', 'member')),
  team_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_team_id_idx on public.profiles (team_id);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------
create table if not exists public.songs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  youtube_url text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists songs_created_at_idx on public.songs (created_at desc);

drop trigger if exists trg_songs_updated_at on public.songs;
create trigger trg_songs_updated_at
  before update on public.songs
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- setlists
-- ---------------------------------------------------------------------------
create table if not exists public.setlists (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  title text not null,
  status text not null default 'prep' check (status in ('prep', 'confirmed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists setlists_status_event_idx on public.setlists (status, event_date desc);

drop trigger if exists trg_setlists_updated_at on public.setlists;
create trigger trg_setlists_updated_at
  before update on public.setlists
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- setlist_songs (다대다)
-- ---------------------------------------------------------------------------
create table if not exists public.setlist_songs (
  setlist_id uuid not null references public.setlists (id) on delete cascade,
  song_id uuid not null references public.songs (id) on delete cascade,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (setlist_id, song_id)
);

create index if not exists setlist_songs_setlist_order_idx
  on public.setlist_songs (setlist_id, order_index);

drop trigger if exists trg_setlist_songs_updated_at on public.setlist_songs;
create trigger trg_setlist_songs_updated_at
  before update on public.setlist_songs
  for each row
  execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security — 로그인 사용자(authenticated) 읽기·쓰기 허용 (MVP)
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.songs enable row level security;
alter table public.setlists enable row level security;
alter table public.setlist_songs enable row level security;

-- profiles
drop policy if exists "authenticated_all_profiles" on public.profiles;
create policy "authenticated_all_profiles"
  on public.profiles
  for all
  to authenticated
  using (true)
  with check (true);

-- songs
drop policy if exists "authenticated_all_songs" on public.songs;
create policy "authenticated_all_songs"
  on public.songs
  for all
  to authenticated
  using (true)
  with check (true);

-- setlists
drop policy if exists "authenticated_all_setlists" on public.setlists;
create policy "authenticated_all_setlists"
  on public.setlists
  for all
  to authenticated
  using (true)
  with check (true);

-- setlist_songs
drop policy if exists "authenticated_all_setlist_songs" on public.setlist_songs;
create policy "authenticated_all_setlist_songs"
  on public.setlist_songs
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- (선택) 샘플 데이터 — 필요 시 주석 해제 후 실행
-- ---------------------------------------------------------------------------
-- insert into public.songs (title, youtube_url, description)
-- values
--   ('샘플 찬양', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', '테스트');
-- insert into public.setlists (event_date, title, status)
-- values (current_date + 14, '다음주 예배 (예습)', 'prep');
-- insert into public.setlist_songs (setlist_id, song_id, order_index)
-- select s.id, g.id, 0
-- from public.setlists s
-- cross join public.songs g
-- where s.title = '다음주 예배 (예습)' and g.title = '샘플 찬양'
-- limit 1;
