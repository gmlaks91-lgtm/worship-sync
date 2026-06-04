begin;

-- =============================================================================
-- 부루마블 미션(별) 칸 DB + RPC floor() 명시 + Realtime
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) blue_marble_missions 테이블
-- ---------------------------------------------------------------------------
create table if not exists public.blue_marble_missions (
  tile_index integer primary key check (tile_index >= 0 and tile_index <= 23),
  mission_text text not null check (char_length(trim(mission_text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.blue_marble_missions is '부루마블 보드판 미션(별) 칸 설정';
comment on column public.blue_marble_missions.tile_index is '보드 칸 번호 (0~23)';
comment on column public.blue_marble_missions.mission_text is '해당 칸 도착 시 수행할 미션 내용';

drop trigger if exists trg_blue_marble_missions_updated_at on public.blue_marble_missions;
create trigger trg_blue_marble_missions_updated_at
  before update on public.blue_marble_missions
  for each row
  execute function public.set_updated_at();

alter table public.blue_marble_missions enable row level security;

drop policy if exists "blue_marble_missions_select_all" on public.blue_marble_missions;
create policy "blue_marble_missions_select_all"
  on public.blue_marble_missions
  for select
  using (true);

drop policy if exists "blue_marble_missions_leader_insert" on public.blue_marble_missions;
create policy "blue_marble_missions_leader_insert"
  on public.blue_marble_missions
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "blue_marble_missions_leader_update" on public.blue_marble_missions;
create policy "blue_marble_missions_leader_update"
  on public.blue_marble_missions
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "blue_marble_missions_leader_delete" on public.blue_marble_missions;
create policy "blue_marble_missions_leader_delete"
  on public.blue_marble_missions
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

-- 기본 미션 칸 시드 (관리자가 이후 자유롭게 수정/삭제 가능)
insert into public.blue_marble_missions (tile_index, mission_text)
values
  (4, '다 함께 모여 단체 셀카 찍기!'),
  (10, '옆 목장과 하이파이브 퀸즈 교환하기!'),
  (16, '오늘의 QT 한 구절을 크게 외치기!'),
  (22, '목장원 전원 일어나 30초 치어리더 하기!')
on conflict (tile_index) do nothing;

-- ---------------------------------------------------------------------------
-- 2) 일괄 반영 RPC: position = FLOOR((score + pending_score) / 50) % 24
-- ---------------------------------------------------------------------------
create or replace function public.apply_all_pending_marble_moves()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_leader(auth.uid()) then
    raise exception '권한이 없습니다. 리더/관리자만 일괄 반영할 수 있습니다.';
  end if;

  update public.blue_marble
  set
    score = greatest(0, score + pending_score),
    position = (floor(greatest(0, score + pending_score)::numeric / 50)::integer % 24),
    pending_score = 0,
    pending_move = 0
  where pending_score <> 0;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Realtime: 미션 테이블도 구독 가능하게
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.blue_marble_missions;
  end if;
exception
  when duplicate_object then null;
end;
$$;

alter table public.blue_marble_missions replica identity full;

commit;
