-- 포인트 로그/자동 적립 시스템

alter table public.profiles
  add column if not exists points integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('leader', 'admin', 'member'));

create table if not exists public.point_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,
  points integer not null,
  occurred_on date not null default ((now() at time zone 'Asia/Seoul')::date),
  created_at timestamptz not null default now()
);

create index if not exists point_logs_user_day_idx on public.point_logs (user_id, occurred_on desc);
create index if not exists point_logs_user_event_day_idx on public.point_logs (user_id, event_type, occurred_on desc);

alter table public.point_logs enable row level security;

drop policy if exists "point_logs_select_own" on public.point_logs;
create policy "point_logs_select_own"
  on public.point_logs
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "point_logs_insert_own" on public.point_logs;
create policy "point_logs_insert_own"
  on public.point_logs
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create or replace function public.award_points(
  p_user_id uuid,
  p_event_type text,
  p_points integer,
  p_once_per_day boolean default false,
  p_daily_activity_cap integer default 50
)
returns table(granted_points integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_activity_points integer := 0;
begin
  if p_points <= 0 then
    return query select 0, '유효하지 않은 포인트 값입니다.';
    return;
  end if;

  if p_once_per_day then
    if exists (
      select 1 from public.point_logs
      where user_id = p_user_id
        and event_type = p_event_type
        and occurred_on = v_today
    ) then
      return query select 0, '이미 오늘 지급되었습니다.';
      return;
    end if;
  end if;

  if p_event_type in ('sheet_view', 'schedule_check', 'board_post') then
    select coalesce(sum(points), 0) into v_activity_points
    from public.point_logs
    where user_id = p_user_id
      and occurred_on = v_today
      and event_type in ('sheet_view', 'schedule_check', 'board_post');

    if v_activity_points >= p_daily_activity_cap then
      return query select 0, '오늘 활동 포인트 한도에 도달했습니다.';
      return;
    end if;

    p_points := least(p_points, p_daily_activity_cap - v_activity_points);
    if p_points <= 0 then
      return query select 0, '오늘 활동 포인트 한도에 도달했습니다.';
      return;
    end if;
  end if;

  update public.profiles
  set points = greatest(0, coalesce(points, 0) + p_points)
  where id = p_user_id;

  insert into public.point_logs (user_id, event_type, points, occurred_on)
  values (p_user_id, p_event_type, p_points, v_today);

  return query select p_points, '포인트가 지급되었습니다.';
end;
$$;

create or replace function public.spend_points(
  p_user_id uuid,
  p_event_type text,
  p_points integer
)
returns table(spent_points integer, message text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current integer := 0;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if p_points <= 0 then
    return query select 0, '유효하지 않은 포인트 값입니다.';
    return;
  end if;

  select coalesce(points, 0) into v_current
  from public.profiles
  where id = p_user_id
  for update;

  if v_current < p_points then
    return query select 0, '포인트가 부족합니다.';
    return;
  end if;

  update public.profiles
  set points = points - p_points
  where id = p_user_id;

  insert into public.point_logs (user_id, event_type, points, occurred_on)
  values (p_user_id, p_event_type, -p_points, v_today);

  return query select p_points, '포인트가 차감되었습니다.';
end;
$$;

create or replace function public.give_signup_points()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1
    from public.point_logs
    where user_id = new.id and event_type = 'signup_bonus'
  ) into v_exists;

  if not v_exists then
    perform * from public.award_points(new.id, 'signup_bonus', 100, false, 50);
  end if;

  return new;
end;
$$;

drop trigger if exists trg_profiles_signup_points on public.profiles;
create trigger trg_profiles_signup_points
  after insert on public.profiles
  for each row
  execute function public.give_signup_points();
