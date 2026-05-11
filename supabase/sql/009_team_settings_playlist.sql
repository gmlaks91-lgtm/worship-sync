-- =============================================================================
-- Ahaba update: team playlist settings
-- =============================================================================

create table if not exists public.team_settings (
  id boolean primary key default true check (id = true),
  playlist_id text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_team_settings_updated_at on public.team_settings;
create trigger trg_team_settings_updated_at
  before update on public.team_settings
  for each row
  execute function public.set_updated_at();

alter table public.team_settings enable row level security;

drop policy if exists "team_settings_select_authenticated" on public.team_settings;
create policy "team_settings_select_authenticated"
  on public.team_settings
  for select
  to authenticated
  using (true);

drop policy if exists "team_settings_insert_leader" on public.team_settings;
create policy "team_settings_insert_leader"
  on public.team_settings
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "team_settings_update_leader" on public.team_settings;
create policy "team_settings_update_leader"
  on public.team_settings
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

insert into public.team_settings (id, playlist_id)
values (true, null)
on conflict (id) do nothing;

comment on table public.team_settings is '팀 공용 설정 (유튜브 추천 플레이리스트 등)';
comment on column public.team_settings.playlist_id is '유튜브 플레이리스트 ID';
