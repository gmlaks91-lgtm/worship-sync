-- =============================================================================
-- Supabase SQL Editor용 — teams / team_members
-- (supabase/migrations/20260520120000_teams_and_team_members.sql 와 동일)
-- =============================================================================
-- 멤버 배정 예시:
-- insert into public.team_members (user_id, team_id)
-- select p.id, t.id from public.profiles p
-- cross join public.teams t
-- where p.username = '홍길동' and t.slug in ('worship', 'heeman');
-- =============================================================================

begin;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  created_at timestamptz not null default now(),
  constraint teams_name_unique unique (name),
  constraint teams_slug_unique unique (slug)
);

create index if not exists teams_slug_idx on public.teams (slug);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  team_id uuid not null references public.teams (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint team_members_user_team_unique unique (user_id, team_id)
);

create index if not exists team_members_user_id_idx on public.team_members (user_id);
create index if not exists team_members_team_id_idx on public.team_members (team_id);

insert into public.teams (name, slug)
values
  ('찬양팀', 'worship'),
  ('희만목장', 'heeman'),
  ('홍기목장', 'honggi')
on conflict (slug) do nothing;

create or replace function public.shares_team_with(p_viewer uuid, p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm1
    inner join public.team_members tm2 on tm2.team_id = tm1.team_id
    where tm1.user_id = p_viewer
      and tm2.user_id = p_author
  );
$$;

create or replace function public.is_member_of_team(p_user_id uuid, p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.team_members tm
    where tm.user_id = p_user_id
      and tm.team_id = p_team_id
  );
$$;

grant execute on function public.shares_team_with(uuid, uuid) to authenticated;
grant execute on function public.is_member_of_team(uuid, uuid) to authenticated;

alter table public.teams enable row level security;

drop policy if exists "teams_select_authenticated" on public.teams;
create policy "teams_select_authenticated"
  on public.teams for select to authenticated using (true);

drop policy if exists "teams_manage_leader" on public.teams;
create policy "teams_manage_leader"
  on public.teams for all to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

alter table public.team_members enable row level security;

drop policy if exists "team_members_select_shared" on public.team_members;
create policy "team_members_select_shared"
  on public.team_members for select to authenticated
  using (user_id = auth.uid() or public.shares_team_with(auth.uid(), user_id));

drop policy if exists "team_members_manage_leader" on public.team_members;
create policy "team_members_manage_leader"
  on public.team_members for all to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "weekly_checklists_select_team_peers" on public.weekly_checklists;
create policy "weekly_checklists_select_team_peers"
  on public.weekly_checklists for select to authenticated
  using (
    auth.uid() is not null
    and user_id <> auth.uid()
    and public.shares_team_with(auth.uid(), user_id)
  );

notify pgrst, 'reload schema';

commit;
