begin;

-- =============================================================================
-- 개인별 경건일지 매일 알림 설정
--  * wants_daily_reminder: 알림 수신 여부
--  * daily_reminder_time: KST 기준 희망 시각 (HH:mm, 초는 00 고정)
-- =============================================================================

alter table public.profiles
  add column if not exists wants_daily_reminder boolean not null default false,
  add column if not exists daily_reminder_time time;

comment on column public.profiles.wants_daily_reminder is '매일 경건일지 작성 푸시 알림 수신 여부';
comment on column public.profiles.daily_reminder_time is '경건일지 알림 희망 시각 (KST, HH:mm)';

create index if not exists profiles_daily_reminder_active_idx
  on public.profiles (daily_reminder_time)
  where wants_daily_reminder = true and daily_reminder_time is not null;

commit;
