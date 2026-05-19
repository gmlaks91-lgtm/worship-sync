-- Supabase SQL Editor: is_leader에 admin 포함 (shop_images Storage 정책 등과 맞춤)
begin;

create or replace function public.is_leader(uid uuid)
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
      where p.id = uid
      limit 1
    ),
    false
  );
$$;

commit;
