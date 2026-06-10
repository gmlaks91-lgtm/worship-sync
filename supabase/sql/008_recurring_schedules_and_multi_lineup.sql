-- =============================================================================
-- Ahaba update: recurring schedules + vocal/staff multi-member lineup
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) 반복 일정 자동 생성을 위한 schedules 중복 방지 인덱스
-- -----------------------------------------------------------------------------
create unique index if not exists schedules_title_kind_starts_at_unique
  on public.schedules (title, kind, starts_at);

comment on index schedules_title_kind_starts_at_unique
  is '토요일 연습/주일 예배 반복 생성 시 중복 삽입 방지';

-- -----------------------------------------------------------------------------
-- 2) setlist_lineups: V/STAFF는 다중 배정 허용, 나머지는 단일 배정 유지
-- -----------------------------------------------------------------------------
alter table public.setlist_lineups
  drop constraint if exists setlist_lineups_setlist_id_role_code_key;

create unique index if not exists setlist_lineups_unique_member_per_role
  on public.setlist_lineups (setlist_id, role_code, member_id);

create unique index if not exists setlist_lineups_single_member_roles
  on public.setlist_lineups (setlist_id, role_code)
  where role_code not in ('V', 'STAFF');

comment on index setlist_lineups_unique_member_per_role
  is '같은 포지션에 같은 멤버가 중복 배정되는 것 방지';

comment on index setlist_lineups_single_member_roles
  is 'V/STAFF 외 포지션은 기존처럼 1명만 배정';
