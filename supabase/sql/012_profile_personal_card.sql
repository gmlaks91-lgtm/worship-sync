-- WorshipSync — 팀 카드용 프로필 필드 (생일, MBTI, 좋아하는 곡)
-- 참고: 컬럼 추가만 필요하면 `supabase/migrations/20260512120000_profiles_personal_fields.sql` 과 동일합니다.
-- 이 파일은 수동 실행용이며, 길이 제한(check)까지 한 번에 적용할 때 사용합니다.

alter table public.profiles
  add column if not exists birthday date,
  add column if not exists mbti text,
  add column if not exists favorite_song text;

comment on column public.profiles.birthday is '생일 (YYYY-MM-DD)';
comment on column public.profiles.mbti is 'MBTI 등 짧은 문자열';
comment on column public.profiles.favorite_song is '가장 좋아하는 곡';

alter table public.profiles
  drop constraint if exists profiles_mbti_len;

alter table public.profiles
  add constraint profiles_mbti_len check (mbti is null or char_length(mbti) <= 16);

alter table public.profiles
  drop constraint if exists profiles_favorite_song_len;

alter table public.profiles
  add constraint profiles_favorite_song_len check (favorite_song is null or char_length(favorite_song) <= 200);
