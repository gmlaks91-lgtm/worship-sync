-- 포인트 상점 + 프로필 꾸미기(아바타/프레임/배지) 스키마 정리

alter table public.profiles
  add column if not exists points integer not null default 0;

create table if not exists public.shop_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null check (category in ('avatar', 'frame', 'badge')),
  image_url text not null,
  effect_value text not null,
  price_points integer not null check (price_points >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.shop_items
  add column if not exists category text,
  add column if not exists image_url text,
  add column if not exists effect_value text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'shop_items' and column_name = 'item_type'
  ) then
    execute $sql$
      update public.shop_items
      set category = case item_type
        when 'border' then 'frame'
        when 'background' then 'avatar'
        else 'badge'
      end
      where category is null
    $sql$;
  end if;
end
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'shop_items' and column_name = 'value'
  ) then
    execute $sql$
      update public.shop_items
      set effect_value = coalesce(effect_value, value)
    $sql$;
  end if;
end
$$;

update public.shop_items
set image_url = coalesce(
  image_url,
  case category
    when 'avatar' then 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80'
    when 'frame' then 'https://images.unsplash.com/photo-1601390395693-364c2b93c8ec?auto=format&fit=crop&w=1200&q=80'
    else 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80'
  end
);

alter table public.shop_items
  alter column category set not null,
  alter column image_url set not null,
  alter column effect_value set not null;

alter table public.shop_items
  drop constraint if exists shop_items_item_type_check,
  drop constraint if exists shop_items_category_check;

alter table public.shop_items
  add constraint shop_items_category_check check (category in ('avatar', 'frame', 'badge'));

create unique index if not exists shop_items_name_key on public.shop_items(name);
create index if not exists shop_items_active_price_idx on public.shop_items (is_active, price_points);

create table if not exists public.user_inventory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  is_applied boolean not null default false,
  acquired_at timestamptz not null default now(),
  unique (user_id, shop_item_id)
);

create index if not exists user_inventory_user_idx on public.user_inventory (user_id);

alter table public.shop_items enable row level security;
alter table public.user_inventory enable row level security;

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

insert into public.shop_items (name, description, category, image_url, effect_value, price_points, is_active)
values
  (
    '다윗의 기타',
    '찬양 시작 전에 마음을 가다듬게 해 주는 따뜻한 프로필 아바타',
    'avatar',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80',
    180,
    true
  ),
  (
    '에스더의 왕관',
    '리더십이 필요한 날, 담대함을 상징하는 골드 프레임',
    'frame',
    'https://images.unsplash.com/photo-1601390395693-364c2b93c8ec?auto=format&fit=crop&w=1200&q=80',
    '#d4a017',
    220,
    true
  ),
  (
    '가시면류관 테두리',
    '겸손과 헌신을 기억하게 하는 은은한 브론즈 프레임',
    'frame',
    'https://images.unsplash.com/photo-1457694587812-e8bf29a43845?auto=format&fit=crop&w=1200&q=80',
    '#8b5a2b',
    170,
    true
  ),
  (
    '찬양의 불꽃 배지',
    '예배 전 열정을 살려 주는 반짝이는 팀 배지',
    'badge',
    'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=1200&q=80',
    '🔥',
    140,
    true
  ),
  (
    '시편 묵상 배지',
    '조용한 연습 시간에 어울리는 차분한 블루 포인트',
    'badge',
    'https://images.unsplash.com/photo-1504052434569-70ad5836ab65?auto=format&fit=crop&w=1200&q=80',
    '📜',
    110,
    true
  )
on conflict (name) do update
set
  description = excluded.description,
  category = excluded.category,
  image_url = excluded.image_url,
  effect_value = excluded.effect_value,
  price_points = excluded.price_points,
  is_active = excluded.is_active;
