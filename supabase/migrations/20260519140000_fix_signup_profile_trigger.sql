-- 회원가입 실패 수정: role_priority 컬럼 추가 + general 역할 허용 + 트리거 안정화

alter table public.profiles
  add column if not exists role_priority_1 text,
  add column if not exists role_priority_2 text,
  add column if not exists role_priority_3 text;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('leader', 'admin', 'member', 'general'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  profile_role text;
  rp1 text;
  rp2 text;
  rp3 text;
begin
  uname := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'user_name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );

  if uname is null or length(trim(uname)) = 0 then
    uname := 'user_' || left(replace(new.id::text, '-', ''), 8);
  end if;

  profile_role := coalesce(nullif(trim(new.raw_user_meta_data->>'profile_role'), ''), 'member');
  if profile_role not in ('leader', 'admin', 'member', 'general') then
    profile_role := 'member';
  end if;

  rp1 := nullif(trim(new.raw_user_meta_data->>'role_priority_1'), '');
  rp2 := nullif(trim(new.raw_user_meta_data->>'role_priority_2'), '');
  rp3 := nullif(trim(new.raw_user_meta_data->>'role_priority_3'), '');

  insert into public.profiles (
    id,
    username,
    role,
    role_priority_1,
    role_priority_2,
    role_priority_3
  )
  values (
    new.id,
    left(trim(uname), 80),
    profile_role,
    rp1,
    rp2,
    rp3
  )
  on conflict (id) do update set
    username = excluded.username,
    role = excluded.role,
    role_priority_1 = excluded.role_priority_1,
    role_priority_2 = excluded.role_priority_2,
    role_priority_3 = excluded.role_priority_3;

  return new;
end;
$$;
