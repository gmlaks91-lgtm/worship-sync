-- =============================================================================
-- WorshipSync — attendance (연습/예배 출석) + RLS
-- 기존 attendance 테이블이 다른 스키마면 데이터 백업 후 실행하세요.
-- =============================================================================

-- 기존 정책/테이블 정리 (주의: attendance 데이터 삭제)
drop policy if exists "authenticated_all_attendance" on public.attendance;
drop policy if exists "attendance_select_all" on public.attendance;
drop policy if exists "attendance_insert_own" on public.attendance;
drop policy if exists "attendance_update_own" on public.attendance;
drop policy if exists "attendance_delete_own" on public.attendance;
drop table if exists public.attendance cascade;

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  event_date date not null,
  event_type text not null check (event_type in ('practice', 'worship')),
  status text not null check (status in ('attending', 'late', 'absent')),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, event_date, event_type)
);

create index if not exists attendance_event_lookup_idx
  on public.attendance (event_date, event_type);

drop trigger if exists trg_attendance_updated_at on public.attendance;
create trigger trg_attendance_updated_at
  before update on public.attendance
  for each row
  execute function public.set_updated_at();

alter table public.attendance enable row level security;

-- 조회: 로그인 사용자 전원
drop policy if exists "attendance_select_all" on public.attendance;
create policy "attendance_select_all"
  on public.attendance
  for select
  to authenticated
  using (true);

-- 생성: 본인 행만
drop policy if exists "attendance_insert_own" on public.attendance;
create policy "attendance_insert_own"
  on public.attendance
  for insert
  to authenticated
  with check (auth.uid() = user_id);

-- 수정: 본인 행만
drop policy if exists "attendance_update_own" on public.attendance;
create policy "attendance_update_own"
  on public.attendance
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
