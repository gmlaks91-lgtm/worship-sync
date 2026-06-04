begin;

-- =============================================================================
-- 부루마블 '라이브 이벤트' 방식 전환
--  * 주중에 대기 점수/이동 칸수(pending_score, pending_move)를 모아둠
--  * 주일에 관리자가 일괄 반영 → score/position에 합산 후 pending 초기화
--  * /marble 뷰어가 즉시 반응하도록 Realtime publication 등록
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) 대기열 컬럼 추가
-- ---------------------------------------------------------------------------
alter table public.blue_marble
  add column if not exists pending_score integer not null default 0,
  add column if not exists pending_move integer not null default 0;

comment on column public.blue_marble.pending_score is '이번 주 반영 대기 점수 (일괄 반영 시 score에 합산)';
comment on column public.blue_marble.pending_move is '이번 주 반영 대기 이동 칸수 (일괄 반영 시 position에 합산)';

-- ---------------------------------------------------------------------------
-- 2) 일괄 반영 RPC: 모든 목장의 pending 값을 본 값에 합산하고 pending 초기화
--    - 리더/관리자만 실행 가능 (security definer + is_leader 검사)
--    - position은 0~23 범위로 순환(mod 24), score는 0 미만 방지
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
    position = ((position + pending_move) % 24 + 24) % 24,
    pending_score = 0,
    pending_move = 0
  where pending_score <> 0 or pending_move <> 0;
end;
$$;

grant execute on function public.apply_all_pending_marble_moves() to authenticated;

-- ---------------------------------------------------------------------------
-- 3) Realtime: blue_marble UPDATE 이벤트 브로드캐스트 (publication 존재 시에만)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.blue_marble;
  end if;
exception
  when duplicate_object then null;
end;
$$;

-- Realtime UPDATE payload에 변경 전/후 전체 행이 담기도록 full replica identity 설정
alter table public.blue_marble replica identity full;

commit;
