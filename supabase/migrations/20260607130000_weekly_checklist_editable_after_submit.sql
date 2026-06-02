-- =============================================================================
-- 주간 경건일지: 제출 후에도 수정/재제출 허용
-- - UPDATE RLS에서 is_submitted = false 제약 제거 (본인 글이면 언제든 수정)
-- - submit_weekly_checklist 재제출 시 점수 재계산 + 차액(delta)만 정산
-- =============================================================================

begin;

-- 1) 본인 행이면 제출 여부와 무관하게 수정 허용
drop policy if exists "weekly_checklists_update_own_draft" on public.weekly_checklists;
create policy "weekly_checklists_update_own"
  on public.weekly_checklists
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 2) 재제출 지원: 이미 제출된 경우 기존 지급분과의 차액만 반영
create or replace function public.submit_weekly_checklist(
  p_week_start_date date
)
returns table(awarded_points integer, total_points integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.weekly_checklists%rowtype;
  v_total integer := 0;
  v_delta integer := 0;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_resubmit boolean := false;
begin
  if v_user_id is null then
    return query select 0, 0, '로그인이 필요합니다.';
    return;
  end if;

  select *
  into v_row
  from public.weekly_checklists
  where user_id = v_user_id
    and week_start_date = p_week_start_date
  limit 1
  for update;

  if not found then
    return query select 0, 0, '제출할 체크리스트가 없습니다.';
    return;
  end if;

  v_resubmit := v_row.is_submitted;
  v_total := public.calculate_weekly_checklist_points(v_row.daily_records, v_row.worship_records);
  -- 기존 지급분 대비 차액 (최초 제출이면 awarded_points = 0)
  v_delta := v_total - coalesce(v_row.awarded_points, 0);

  update public.weekly_checklists
  set
    total_points = v_total,
    awarded_points = v_total,
    is_submitted = true,
    submitted_at = now()
  where id = v_row.id;

  if v_delta <> 0 then
    update public.profiles
    set points = greatest(0, coalesce(points, 0) + v_delta)
    where id = v_user_id;

    insert into public.point_logs (user_id, event_type, points, occurred_on)
    values (v_user_id, 'weekly_checklist_submit', v_delta, v_today);
  end if;

  return query select
    v_total,
    v_total,
    case when v_resubmit then '수정한 내용으로 다시 제출되었습니다.' else '이번 주 체크리스트가 제출되었습니다.' end;
end;
$$;

grant execute on function public.submit_weekly_checklist(date) to authenticated;

notify pgrst, 'reload schema';

commit;
