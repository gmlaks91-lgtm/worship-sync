-- =============================================================================
-- Shop: description TEXT 보장, 재고(stock), 중고 장터(멤버 거래)
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1) description → TEXT (길이 제한 제거)
-- -----------------------------------------------------------------------------
alter table public.shop_items
  alter column description type text using description::text;

comment on column public.shop_items.description is '상품 설명 (길이 제한 없음)';

-- -----------------------------------------------------------------------------
-- 2) 재고(stock): NULL = 무제한, 0 = 품절, >0 = 남은 수량
-- -----------------------------------------------------------------------------
alter table public.shop_items
  add column if not exists stock integer check (stock is null or stock >= 0);

comment on column public.shop_items.stock is '재고. NULL=무제한, 0=품절, 양수=남은 수량';

-- -----------------------------------------------------------------------------
-- 3) 중고 장터 listings
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  inventory_id uuid not null references public.user_inventory(id) on delete cascade,
  shop_item_id uuid not null references public.shop_items(id) on delete cascade,
  price_points integer not null check (price_points > 0),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references public.profiles(id) on delete set null,
  sold_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists inventory_marketplace_listings_status_idx
  on public.inventory_marketplace_listings (status, created_at desc);

create unique index if not exists inventory_marketplace_listings_active_inventory_key
  on public.inventory_marketplace_listings (inventory_id)
  where status = 'active';

alter table public.inventory_marketplace_listings enable row level security;

drop policy if exists "marketplace_listings_select_authenticated" on public.inventory_marketplace_listings;
create policy "marketplace_listings_select_authenticated"
  on public.inventory_marketplace_listings
  for select
  to authenticated
  using (true);

-- -----------------------------------------------------------------------------
-- 4) 상점 구매 RPC (재고 차감)
-- -----------------------------------------------------------------------------
create or replace function public.purchase_shop_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_active boolean;
  v_stock integer;
  v_spent integer;
  v_msg text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', '로그인이 필요합니다.');
  end if;

  select price_points, is_active, stock
  into v_price, v_active, v_stock
  from public.shop_items
  where id = p_item_id
  for update;

  if not found or not coalesce(v_active, false) then
    return jsonb_build_object('ok', false, 'message', '상품을 찾을 수 없습니다.');
  end if;

  if v_stock is not null and v_stock <= 0 then
    return jsonb_build_object('ok', false, 'message', '품절된 상품입니다.');
  end if;

  if exists (
    select 1
    from public.user_inventory
    where user_id = v_user_id and shop_item_id = p_item_id
  ) then
    return jsonb_build_object('ok', false, 'message', '이미 구매한 상품입니다.');
  end if;

  select spent_points, message
  into v_spent, v_msg
  from public.spend_points(v_user_id, 'shop_purchase', v_price)
  limit 1;

  if coalesce(v_spent, 0) <= 0 then
    return jsonb_build_object(
      'ok', false,
      'message', coalesce(v_msg, '포인트가 부족합니다.')
    );
  end if;

  if v_stock is not null then
    update public.shop_items
    set stock = stock - 1
    where id = p_item_id and stock > 0;
  end if;

  insert into public.user_inventory (user_id, shop_item_id)
  values (v_user_id, p_item_id);

  return jsonb_build_object(
    'ok', true,
    'message', '구매가 완료되었습니다.',
    'spent_points', v_spent
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'message', sqlerrm);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 5) 중고 장터: 판매 등록
-- -----------------------------------------------------------------------------
create or replace function public.create_inventory_listing(
  p_inventory_id uuid,
  p_price_points integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
  v_inv public.user_inventory%rowtype;
  v_item public.shop_items%rowtype;
  v_listing_id uuid;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', '로그인이 필요합니다.');
  end if;

  if p_price_points is null or p_price_points <= 0 then
    return jsonb_build_object('ok', false, 'message', '판매 가격은 1P 이상이어야 합니다.');
  end if;

  select * into v_inv
  from public.user_inventory
  where id = p_inventory_id and user_id = v_user_id
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', '보유하지 않은 아이템입니다.');
  end if;

  if exists (
    select 1 from public.inventory_marketplace_listings
    where inventory_id = p_inventory_id and status = 'active'
  ) then
    return jsonb_build_object('ok', false, 'message', '이미 장터에 등록된 아이템입니다.');
  end if;

  select * into v_item from public.shop_items where id = v_inv.shop_item_id;

  if not found then
    return jsonb_build_object('ok', false, 'message', '상품 정보를 찾을 수 없습니다.');
  end if;

  if v_item.category <> 'avatar' then
    return jsonb_build_object('ok', false, 'message', '아바타(앨범) 아이템만 거래할 수 있습니다.');
  end if;

  if v_inv.is_applied then
    update public.user_inventory
    set is_applied = false
    where id = v_inv.id;

    update public.profiles
    set avatar_url = null
    where id = v_user_id;
  end if;

  insert into public.inventory_marketplace_listings (
    seller_id, inventory_id, shop_item_id, price_points
  )
  values (v_user_id, v_inv.id, v_inv.shop_item_id, p_price_points)
  returning id into v_listing_id;

  return jsonb_build_object(
    'ok', true,
    'message', '중고 장터에 등록되었습니다.',
    'listing_id', v_listing_id
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'message', sqlerrm);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 6) 중고 장터: 판매 취소
-- -----------------------------------------------------------------------------
create or replace function public.cancel_inventory_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', '로그인이 필요합니다.');
  end if;

  update public.inventory_marketplace_listings
  set status = 'cancelled'
  where id = p_listing_id
    and seller_id = v_user_id
    and status = 'active';

  if not found then
    return jsonb_build_object('ok', false, 'message', '취소할 등록을 찾을 수 없습니다.');
  end if;

  return jsonb_build_object('ok', true, 'message', '장터 등록을 취소했습니다.');
exception
  when others then
    return jsonb_build_object('ok', false, 'message', sqlerrm);
end;
$function$;

-- -----------------------------------------------------------------------------
-- 7) 중고 장터: 구매 (포인트 이동 + 소유권 이전)
-- -----------------------------------------------------------------------------
create or replace function public.purchase_inventory_listing(p_listing_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $function$
declare
  v_buyer_id uuid := auth.uid();
  v_listing public.inventory_marketplace_listings%rowtype;
  v_inv public.user_inventory%rowtype;
  v_item public.shop_items%rowtype;
  v_spent integer;
  v_msg text;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
begin
  if v_buyer_id is null then
    return jsonb_build_object('ok', false, 'message', '로그인이 필요합니다.');
  end if;

  select * into v_listing
  from public.inventory_marketplace_listings
  where id = p_listing_id and status = 'active'
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'message', '판매 중인 상품을 찾을 수 없습니다.');
  end if;

  if v_listing.seller_id = v_buyer_id then
    return jsonb_build_object('ok', false, 'message', '본인이 등록한 상품은 구매할 수 없습니다.');
  end if;

  select * into v_inv
  from public.user_inventory
  where id = v_listing.inventory_id and user_id = v_listing.seller_id
  for update;

  if not found then
    update public.inventory_marketplace_listings
    set status = 'cancelled'
    where id = p_listing_id;
    return jsonb_build_object('ok', false, 'message', '판매자의 보유 정보가 유효하지 않습니다.');
  end if;

  if exists (
    select 1 from public.user_inventory
    where user_id = v_buyer_id and shop_item_id = v_listing.shop_item_id
  ) then
    return jsonb_build_object('ok', false, 'message', '이미 동일한 아이템을 보유하고 있습니다.');
  end if;

  select spent_points, message
  into v_spent, v_msg
  from public.spend_points(v_buyer_id, 'marketplace_purchase', v_listing.price_points)
  limit 1;

  if coalesce(v_spent, 0) <= 0 then
    return jsonb_build_object(
      'ok', false,
      'message', coalesce(v_msg, '포인트가 부족합니다.')
    );
  end if;

  update public.profiles
  set points = coalesce(points, 0) + v_listing.price_points
  where id = v_listing.seller_id;

  insert into public.point_logs (user_id, event_type, points, occurred_on)
  values (v_listing.seller_id, 'marketplace_sale', v_listing.price_points, v_today);

  update public.user_inventory
  set user_id = v_buyer_id, is_applied = false
  where id = v_inv.id;

  update public.inventory_marketplace_listings
  set
    status = 'sold',
    buyer_id = v_buyer_id,
    sold_at = now()
  where id = p_listing_id;

  return jsonb_build_object(
    'ok', true,
    'message', '거래가 완료되었습니다.',
    'spent_points', v_spent
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'message', sqlerrm);
end;
$function$;

grant execute on function public.purchase_shop_item(uuid) to authenticated;
grant execute on function public.create_inventory_listing(uuid, integer) to authenticated;
grant execute on function public.cancel_inventory_listing(uuid) to authenticated;
grant execute on function public.purchase_inventory_listing(uuid) to authenticated;

commit;
