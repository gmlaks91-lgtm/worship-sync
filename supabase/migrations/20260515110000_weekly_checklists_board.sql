-- =============================================================================
-- Weekly Checklist Board
-- - 사용자별 주간 체크리스트 초안 저장
-- - 주간 점수 계산
-- - 제출 시 points + point_logs 반영
-- =============================================================================

begin;

create or replace function public.can_manage_weekly_checklists(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.role in ('leader', 'admin')
      from public.profiles p
      where p.id = p_uid
      limit 1
    ),
    false
  );
$$;

create table if not exists public.weekly_checklists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  daily_records jsonb not null default '[]'::jsonb,
  worship_records jsonb not null default '{}'::jsonb,
  total_points integer not null default 0 check (total_points >= 0 and total_points <= 100),
  awarded_points integer not null default 0 check (awarded_points >= 0 and awarded_points <= 100),
  is_submitted boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint weekly_checklists_user_week_key unique (user_id, week_start_date)
);

create index if not exists weekly_checklists_week_idx
  on public.weekly_checklists (week_start_date desc);

create index if not exists weekly_checklists_user_week_idx
  on public.weekly_checklists (user_id, week_start_date desc);

drop trigger if exists trg_weekly_checklists_updated_at on public.weekly_checklists;
create trigger trg_weekly_checklists_updated_at
  before update on public.weekly_checklists
  for each row
  execute function public.set_updated_at();

create or replace function public.calculate_weekly_checklist_points(
  p_daily_records jsonb,
  p_worship_records jsonb
)
returns integer
language plpgsql
stable
set search_path = public
as $$
declare
  v_total integer := 0;
  v_day jsonb;
  v_bible integer;
  v_qt boolean;
  v_prayer boolean;
  v_day_points integer;
begin
  if coalesce(jsonb_typeof(p_daily_records), 'null') = 'array' then
    for v_day in
      select value
      from jsonb_array_elements(p_daily_records)
    loop
      v_bible := case
        when coalesce(v_day ->> 'bibleChapters', '') ~ '^\d+$' then (v_day ->> 'bibleChapters')::integer
        else 0
      end;
      v_qt := coalesce(v_day ->> 'qtDone', 'false') = 'true';
      v_prayer := coalesce(v_day ->> 'prayerDone', 'false') = 'true';

      v_day_points :=
        case when v_bible >= 7 then 2 else 0 end +
        case when v_qt then 2 else 0 end +
        case when v_prayer then 2 else 0 end;

      if v_bible >= 7 and v_qt and v_prayer then
        v_total := v_total + 12;
      else
        v_total := v_total + v_day_points;
      end if;
    end loop;
  end if;

  if coalesce(p_worship_records ->> 'sundayFirstService', 'false') = 'true'
     or coalesce(p_worship_records ->> 'sundaySecondService', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  if coalesce(p_worship_records ->> 'youthService', 'false') = 'true' then
    v_total := v_total + case
      when coalesce(p_worship_records ->> 'youthEarlyArrival', 'false') = 'true' then 4
      else 3
    end;
  end if;

  if coalesce(p_worship_records ->> 'wednesdayService', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  if coalesce(p_worship_records ->> 'fridayPrayer', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  if coalesce(p_worship_records ->> 'saturdayPrayer', 'false') = 'true' then
    v_total := v_total + 3;
  end if;

  return least(v_total, 100);
end;
$$;

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
  v_today date := (now() at time zone 'Asia/Seoul')::date;
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

  if v_row.is_submitted then
    return query select v_row.awarded_points, v_row.total_points, '이미 제출된 주간 체크리스트입니다.';
    return;
  end if;

  v_total := public.calculate_weekly_checklist_points(v_row.daily_records, v_row.worship_records);

  update public.weekly_checklists
  set
    total_points = v_total,
    awarded_points = v_total,
    is_submitted = true,
    submitted_at = now()
  where id = v_row.id;

  if v_total > 0 then
    update public.profiles
    set points = greatest(0, coalesce(points, 0) + v_total)
    where id = v_user_id;

    insert into public.point_logs (user_id, event_type, points, occurred_on)
    values (v_user_id, 'weekly_checklist_submit', v_total, v_today);
  end if;

  return query select v_total, v_total, '이번 주 체크리스트가 제출되었습니다.';
end;
$$;

grant execute on function public.calculate_weekly_checklist_points(jsonb, jsonb) to authenticated;
grant execute on function public.submit_weekly_checklist(date) to authenticated;

alter table public.weekly_checklists enable row level security;

drop policy if exists "weekly_checklists_select_own" on public.weekly_checklists;
create policy "weekly_checklists_select_own"
  on public.weekly_checklists
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "weekly_checklists_select_manage" on public.weekly_checklists;
create policy "weekly_checklists_select_manage"
  on public.weekly_checklists
  for select
  to authenticated
  using (public.can_manage_weekly_checklists(auth.uid()));

drop policy if exists "weekly_checklists_insert_own" on public.weekly_checklists;
create policy "weekly_checklists_insert_own"
  on public.weekly_checklists
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "weekly_checklists_update_own_draft" on public.weekly_checklists;
create policy "weekly_checklists_update_own_draft"
  on public.weekly_checklists
  for update
  to authenticated
  using (auth.uid() = user_id and is_submitted = false)
  with check (auth.uid() = user_id);

notify pgrst, 'reload schema';

commit;
