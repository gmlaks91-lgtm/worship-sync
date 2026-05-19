begin;

-- 리더·관리자 공통 권한 (Storage shop_images 등에서 사용)
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
