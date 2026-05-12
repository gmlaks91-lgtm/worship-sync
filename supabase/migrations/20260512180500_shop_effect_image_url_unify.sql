-- frame/badge 포함 모든 상점 아이템 장착 로직을 이미지 URL 기반으로 통일

update public.shop_items
set effect_value = image_url
where coalesce(effect_value, '') = '' or effect_value !~* '^https?://';

alter table public.shop_items
  drop constraint if exists shop_items_effect_value_url_check;

alter table public.shop_items
  add constraint shop_items_effect_value_url_check
  check (effect_value ~* '^https?://');
