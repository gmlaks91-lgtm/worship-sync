-- =============================================================================
-- Ahaba update: prayer board + staff notes + song history helpers
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) setlists: STAFF 메모 컬럼
-- -----------------------------------------------------------------------------
alter table public.setlists
  add column if not exists staff_notes text;

comment on column public.setlists.staff_notes is 'STAFF 피드백 및 운영 메모';

-- -----------------------------------------------------------------------------
-- 2) 기도나눔 게시판 테이블
-- -----------------------------------------------------------------------------
create table if not exists public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  content text not null check (length(trim(content)) > 0 and length(content) <= 1000),
  user_id uuid not null references public.profiles(id) on delete cascade,
  is_anonymous boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists prayer_requests_created_idx
  on public.prayer_requests (created_at desc);

create table if not exists public.prayer_reactions (
  request_id uuid not null references public.prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, user_id)
);

create index if not exists prayer_reactions_user_idx
  on public.prayer_reactions (user_id);

-- -----------------------------------------------------------------------------
-- 3) prayer_* RLS
-- -----------------------------------------------------------------------------
alter table public.prayer_requests enable row level security;
alter table public.prayer_reactions enable row level security;

drop policy if exists "prayer_requests_select_authenticated" on public.prayer_requests;
create policy "prayer_requests_select_authenticated"
  on public.prayer_requests
  for select
  to authenticated
  using (true);

drop policy if exists "prayer_requests_insert_own" on public.prayer_requests;
create policy "prayer_requests_insert_own"
  on public.prayer_requests
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "prayer_requests_delete_own_or_leader" on public.prayer_requests;
create policy "prayer_requests_delete_own_or_leader"
  on public.prayer_requests
  for delete
  to authenticated
  using (auth.uid() = user_id or public.is_leader(auth.uid()));

drop policy if exists "prayer_reactions_select_authenticated" on public.prayer_reactions;
create policy "prayer_reactions_select_authenticated"
  on public.prayer_reactions
  for select
  to authenticated
  using (true);

drop policy if exists "prayer_reactions_insert_own" on public.prayer_reactions;
create policy "prayer_reactions_insert_own"
  on public.prayer_reactions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "prayer_reactions_delete_own" on public.prayer_reactions;
create policy "prayer_reactions_delete_own"
  on public.prayer_reactions
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4) 곡 통계 조회 최적화용 인덱스
-- -----------------------------------------------------------------------------
create index if not exists setlist_songs_song_id_idx
  on public.setlist_songs (song_id);

create index if not exists setlists_event_date_idx
  on public.setlists (event_date desc);
