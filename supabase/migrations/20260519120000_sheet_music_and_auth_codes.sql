-- profiles: 팀 포지션 (가입 트리거에서 사용)
alter table public.profiles
  add column if not exists role_priority_1 text,
  add column if not exists role_priority_2 text,
  add column if not exists role_priority_3 text;

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('leader', 'admin', 'member', 'general'));

-- songs: 악보 이미지/PDF URL
alter table public.songs
  add column if not exists sheet_music_url text;

comment on column public.songs.sheet_music_url is '악보 이미지(PNG/JPG) 또는 PDF URL';

-- 찬양팀 가입 인증 코드 (단일 행)
create table if not exists public.auth_codes (
  id int primary key default 1 check (id = 1),
  code text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.auth_codes (id, code)
values (1, 'AHAVA2026')
on conflict (id) do nothing;

alter table public.auth_codes enable row level security;

drop policy if exists "auth_codes_leader_select" on public.auth_codes;
create policy "auth_codes_leader_select"
  on public.auth_codes
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('leader', 'admin')
    )
  );

drop policy if exists "auth_codes_leader_update" on public.auth_codes;
create policy "auth_codes_leader_update"
  on public.auth_codes
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('leader', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('leader', 'admin')
    )
  );

-- 가입 시 metadata.profile_role 반영
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
