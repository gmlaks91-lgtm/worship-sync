-- 팀원 프로필: 생일, MBTI, 좋아하는 곡 (마이페이지에서 본인 수정)
alter table public.profiles
  add column if not exists birthday date,
  add column if not exists mbti text,
  add column if not exists favorite_song text;

comment on column public.profiles.birthday is '생일 (달력 기준, KST 표시용)';
comment on column public.profiles.mbti is 'MBTI (자유 입력 또는 코드)';
comment on column public.profiles.favorite_song is '가장 좋아하는 곡';
