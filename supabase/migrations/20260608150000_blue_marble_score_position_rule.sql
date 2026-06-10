begin;

-- =============================================================================
-- 부루마블 50점 = 1칸 자동 이동 룰
--  * position은 score 기준으로만 결정: floor(score / 50) % 24
--  * pending_move는 더 이상 사용하지 않음 (일괄 반영 시 pending_score만 합산)
-- =============================================================================

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
    position = ((greatest(0, score + pending_score) / 50) % 24),
    pending_score = 0,
    pending_move = 0
  where pending_score <> 0;
end;
$$;

-- 기존 시드 데이터 position을 점수 기준으로 동기화
update public.blue_marble
set position = ((greatest(0, score) / 50) % 24);

comment on column public.blue_marble.pending_move is '레거시 컬럼 (50점 룰 적용 후 미사용, 항상 0)';

commit;
