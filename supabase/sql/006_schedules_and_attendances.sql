-- =============================================================================
-- WorshipSync — 일정(schedules) + 일정별 참석(attendances)
-- 001~005 적용 후 Supabase SQL Editor에서 실행하세요.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) schedules — 연습 / 예배 / 회식 등
-- ---------------------------------------------------------------------------
create table if not exists public.schedules (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('practice', 'worship', 'social')),
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists schedules_starts_at_idx
  on public.schedules (starts_at asc);

drop trigger if exists trg_schedules_updated_at on public.schedules;
create trigger trg_schedules_updated_at
  before update on public.schedules
  for each row
  execute function public.set_updated_at();

alter table public.schedules enable row level security;

drop policy if exists "schedules_select_authenticated" on public.schedules;
create policy "schedules_select_authenticated"
  on public.schedules
  for select
  to authenticated
  using (true);

drop policy if exists "schedules_insert_leader" on public.schedules;
create policy "schedules_insert_leader"
  on public.schedules
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "schedules_update_leader" on public.schedules;
create policy "schedules_update_leader"
  on public.schedules
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "schedules_delete_leader" on public.schedules;
create policy "schedules_delete_leader"
  on public.schedules
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

comment on table public.schedules is '팀 일정(연습·예배·회식 등). starts_at에 일시 저장.';
comment on column public.schedules.kind is 'practice | worship | social';

-- ---------------------------------------------------------------------------
-- 2) attendances — 일정별 멤버 참석 여부 (참석 / 불참 / 미정)
-- ---------------------------------------------------------------------------
create table if not exists public.attendances (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.schedules (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('attending', 'absent', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, user_id)
);

create index if not exists attendances_schedule_idx
  on public.attendances (schedule_id);

create index if not exists attendances_user_idx
  on public.attendances (user_id);

drop trigger if exists trg_attendances_updated_at on public.attendances;
create trigger trg_attendances_updated_at
  before update on public.attendances
  for each row
  execute function public.set_updated_at();

alter table public.attendances enable row level security;

drop policy if exists "attendances_select_authenticated" on public.attendances;
create policy "attendances_select_authenticated"
  on public.attendances
  for select
  to authenticated
  using (true);

drop policy if exists "attendances_insert_own" on public.attendances;
create policy "attendances_insert_own"
  on public.attendances
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "attendances_update_own" on public.attendances;
create policy "attendances_update_own"
  on public.attendances
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.attendances is '일정별 사용자 응답: attending(참석), absent(불참), pending(미정)';
comment on column public.attendances.status is 'attending | absent | pending';
