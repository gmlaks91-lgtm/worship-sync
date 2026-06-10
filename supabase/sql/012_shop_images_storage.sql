-- Supabase SQL Editor에서 실행하세요. (migrations/20260519160000_shop_images_storage.sql 와 동일)

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'shop_images',
  'shop_images',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "shop_images_public_read" on storage.objects;
create policy "shop_images_public_read"
  on storage.objects
  for select
  using (bucket_id = 'shop_images');

drop policy if exists "shop_images_leader_insert" on storage.objects;
create policy "shop_images_leader_insert"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'shop_images'
    and public.is_leader(auth.uid())
    and name like 'shop/%'
  );

drop policy if exists "shop_images_leader_update" on storage.objects;
create policy "shop_images_leader_update"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'shop_images'
    and public.is_leader(auth.uid())
    and name like 'shop/%'
  )
  with check (
    bucket_id = 'shop_images'
    and public.is_leader(auth.uid())
    and name like 'shop/%'
  );

drop policy if exists "shop_images_leader_delete" on storage.objects;
create policy "shop_images_leader_delete"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'shop_images'
    and public.is_leader(auth.uid())
    and name like 'shop/%'
  );

create or replace function public.purchase_shop_item(p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_price integer;
  v_active boolean;
  v_spent integer;
  v_msg text;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'message', '로그인이 필요합니다.');
  end if;

  select price_points, is_active
  into v_price, v_active
  from public.shop_items
  where id = p_item_id;

  if not found or not coalesce(v_active, false) then
    return jsonb_build_object('ok', false, 'message', '상품을 찾을 수 없습니다.');
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
      'ok',
      false,
      'message',
      coalesce(v_msg, '포인트가 부족합니다.')
    );
  end if;

  insert into public.user_inventory (user_id, shop_item_id)
  values (v_user_id, p_item_id);

  return jsonb_build_object(
    'ok',
    true,
    'message',
    '구매가 완료되었습니다.',
    'spent_points',
    v_spent
  );
exception
  when others then
    return jsonb_build_object('ok', false, 'message', sqlerrm);
end;
$$;

grant execute on function public.purchase_shop_item(uuid) to authenticated;

commit;
