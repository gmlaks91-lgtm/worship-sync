-- 일반 청년부원(general) 역할 추가
alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('leader', 'admin', 'member', 'general'));

comment on column public.profiles.role is 'leader/admin/member: 찬양팀, general: 일반 청년부원';
