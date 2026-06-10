begin;

-- =============================================================================
-- 부루마블: 주간 점수 일괄 반영 RPC + score 변경 시 position 자동 동기화
--  * 클라이언트 FormData/RLS 이슈를 피하기 위해 security definer RPC 사용
--  * 50점 = 1칸: floor(score / 50) % 24
-- =============================================================================

create or replace function public.sync_blue_marble_position_from_score()
returns trigger
language plpgsql
as $$
begin
  new.position :=
    (floor(greatest(0, new.score)::numeric / 50)::integer % 24);
  return new;
end;
$$;

drop trigger if exists trg_blue_marble_sync_position on public.blue_marble;
create trigger trg_blue_marble_sync_position
  before insert or update of score on public.blue_marble
  for each row
  execute function public.sync_blue_marble_position_from_score();

-- 기존 데이터 position 동기화
update public.blue_marble
set position = (floor(greatest(0, score)::numeric / 50)::integer % 24);

create or replace function public.apply_marble_score_deltas(p_deltas jsonb)
returns table(updated_count integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_item jsonb;
  v_team_id uuid;
  v_delta integer;
  v_new_score integer;
  v_count integer := 0;
begin
  if v_user_id is null or not public.is_leader(v_user_id) then
    return query select 0, '권한이 없습니다. 리더/관리자만 일괄 반영할 수 있습니다.'::text;
    return;
  end if;

  if p_deltas is null or jsonb_typeof(p_deltas) <> 'array' then
    return query select 0, '잘못된 요청입니다.'::text;
    return;
  end if;

  for v_item in select value from jsonb_array_elements(p_deltas) as t(value)
  loop
    begin
      v_team_id := (v_item->>'id')::uuid;
    exception
      when others then
        continue;
    end;

    v_delta := coalesce((v_item->>'delta')::integer, 0);
    if v_delta = 0 then
      continue;
    end if;

    select greatest(0, score + v_delta)
    into v_new_score
    from public.blue_marble
    where id = v_team_id;

    if not found then
      continue;
    end if;

    update public.blue_marble
    set
      score = v_new_score,
      position = (floor(v_new_score::numeric / 50)::integer % 24),
      pending_score = 0,
      pending_move = 0
    where id = v_team_id;

    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    return query select 0, '반영할 점수 변경이 없습니다. 추가 점수를 입력했는지 확인해 주세요.'::text;
  end if;

  return query select v_count, format('목장 %s개 점수가 반영되었습니다.', v_count)::text;
end;
$$;

grant execute on function public.apply_marble_score_deltas(jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
