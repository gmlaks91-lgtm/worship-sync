-- =============================================================================
-- Ahaba update: calendar attendance, worship video, faith points, shop
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) profiles: 포인트/커스텀 표시 컬럼 추가
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists points integer not null default 0,
  add column if not exists active_badge text,
  add column if not exists active_border_color text,
  add column if not exists active_background_color text;

comment on column public.profiles.points is '신앙 점검/활동으로 획득한 누적 포인트';
comment on column public.profiles.active_badge is '현재 적용 중인 뱃지 값';
comment on column public.profiles.active_border_color is '현재 적용 중인 프로필 테두리 값';
comment on column public.profiles.active_background_color is '현재 적용 중인 프로필 배경값';

-- -----------------------------------------------------------------------------
-- 2) attendances: pending 제거 + 불참 사유(reason) 추가
-- -----------------------------------------------------------------------------
alter table public.attendances
  add column if not exists reason text;

alter table public.attendances
  drop constraint if exists attendances_status_check;

alter table public.attendances
  add constraint attendances_status_check
  check (status in ('attending', 'absent'));

alter table public.attendances
  drop constraint if exists attendances_absent_reason_check;

alter table public.attendances
  add constraint attendances_absent_reason_check
  check (
    (status = 'attending' and reason is null)
    or (status = 'absent' and reason is not null and length(trim(reason)) > 0)
  );

comment on column public.attendances.reason is '불참 사유';

-- 기존 pending 데이터가 있으면 불참 + 기본 사유로 정리
update public.attendances
set
  status = 'absent',
  reason = coalesce(nullif(trim(reason), ''), '사유 미입력')
where status not in ('attending', 'absent');

-- -----------------------------------------------------------------------------
-- 3) team_settings: 지난주 예배 영상 URL 컬럼 추가
-- -----------------------------------------------------------------------------
alter table public.team_settings
  add column if not exists last_worship_video_url text;

comment on column public.team_settings.last_worship_video_url is '지난주 예배 유튜브 영상 URL';

-- -----------------------------------------------------------------------------
-- 4) 프로필 포인트 증감 함수
-- -----------------------------------------------------------------------------
create or replace function public.increment_profile_points(p_user_id uuid, p_points integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set points = greatest(0, coalesce(points, 0) + coalesce(p_points, 0))
  where id = p_user_id;
end;
$$;

create or replace function public.decrement_profile_points(p_user_id uuid, p_points integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set points = greatest(0, coalesce(points, 0) - coalesce(p_points, 0))
  where id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- 5) faith_checks: 신앙 점검표
-- -----------------------------------------------------------------------------
create table if not exists public.faith_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  check_date date not null,
  check_type text not null check (check_type in ('qt', 'prayer', 'bible')),
  points_earned integer not null default 10 check (points_earned >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, check_date, check_type)
);

create index if not exists faith_checks_user_date_idx
  on public.faith_checks (user_id, check_date desc);

alter table public.faith_checks enable row level security;

drop policy if exists "faith_checks_select_own" on public.faith_checks;
create policy "faith_checks_select_own"
  on public.faith_checks
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "faith_checks_insert_own" on public.faith_checks;
create policy "faith_checks_insert_own"
  on public.faith_checks
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "faith_checks_delete_own" on public.faith_checks;
create policy "faith_checks_delete_own"
  on public.faith_checks
  for delete
  to authenticated
  using (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 6) shop_items / user_inventory: 포인트 상점
-- -----------------------------------------------------------------------------
create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  item_type text not null check (item_type in ('border', 'badge', 'background')),
  value text not null,
  price_points integer not null check (price_points >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists shop_items_active_price_idx
  on public.shop_items (is_active, price_points);

alter table public.shop_items enable row level security;

drop policy if exists "shop_items_select_authenticated" on public.shop_items;
create policy "shop_items_select_authenticated"
  on public.shop_items
  for select
  to authenticated
  using (true);

drop policy if exists "shop_items_manage_leader" on public.shop_items;
create policy "shop_items_manage_leader"
  on public.shop_items
  for all
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  is_applied boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (user_id, shop_item_id)
);

create index if not exists user_inventory_user_idx
  on public.user_inventory (user_id);

alter table public.user_inventory enable row level security;

drop policy if exists "user_inventory_select_own" on public.user_inventory;
create policy "user_inventory_select_own"
  on public.user_inventory
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_inventory_insert_own" on public.user_inventory;
create policy "user_inventory_insert_own"
  on public.user_inventory
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_inventory_update_own" on public.user_inventory;
create policy "user_inventory_update_own"
  on public.user_inventory
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 7) 기본 상점 아이템 시드
-- -----------------------------------------------------------------------------
insert into public.shop_items (name, description, item_type, value, price_points, is_active)
values
  ('보라 테두리', '프로필 카드 테두리를 보라색으로 적용합니다.', 'border', '#7c3aed', 120, true),
  ('골드 테두리', '프로필 카드 테두리를 금색으로 적용합니다.', 'border', '#d4a017', 180, true),
  ('빛나는 뱃지', '닉네임 옆에 빛나는 뱃지를 표시합니다.', 'badge', '✨', 150, true),
  ('충성 뱃지', '닉네임 옆에 충성 뱃지를 표시합니다.', 'badge', '🛡️', 140, true),
  ('따뜻한 배경', '프로필 배경 톤을 따뜻한 색감으로 변경합니다.', 'background', 'warm', 200, true),
  ('차분한 배경', '프로필 배경 톤을 차분한 색감으로 변경합니다.', 'background', 'calm', 200, true)
on conflict do nothing;
