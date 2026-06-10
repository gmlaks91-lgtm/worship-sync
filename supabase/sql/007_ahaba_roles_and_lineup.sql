-- =============================================================================
-- Ahaba custom update ? profile role priorities + setlist lineup assignments
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) profiles: 1/2/3���� ���� �÷� �߰�
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists role_priority_1 text,
  add column if not exists role_priority_2 text,
  add column if not exists role_priority_3 text;

alter table public.profiles
  drop constraint if exists profiles_role_priority_1_check;
alter table public.profiles
  add constraint profiles_role_priority_1_check
  check (
    role_priority_1 is null
    or role_priority_1 in ('L', 'M', 'S', 'D', 'A/G', 'B/G', 'E/G', 'V', 'STAFF')
  );

alter table public.profiles
  drop constraint if exists profiles_role_priority_2_check;
alter table public.profiles
  add constraint profiles_role_priority_2_check
  check (
    role_priority_2 is null
    or role_priority_2 in ('L', 'M', 'S', 'D', 'A/G', 'B/G', 'E/G', 'V', 'STAFF')
  );

alter table public.profiles
  drop constraint if exists profiles_role_priority_3_check;
alter table public.profiles
  add constraint profiles_role_priority_3_check
  check (
    role_priority_3 is null
    or role_priority_3 in ('L', 'M', 'S', 'D', 'A/G', 'B/G', 'E/G', 'V', 'STAFF')
  );

comment on column public.profiles.role_priority_1 is 'Ahaba ������ 1����';
comment on column public.profiles.role_priority_2 is 'Ahaba ������ 2����';
comment on column public.profiles.role_priority_3 is 'Ahaba ������ 3����';

-- ���� ������ ���� (leader/member�� �ִ� ������ �ּ� �⺻��)
update public.profiles
set role_priority_1 = case when role = 'leader' then 'L' else coalesce(role_priority_1, 'STAFF') end
where role_priority_1 is null;

-- ---------------------------------------------------------------------------
-- 2) ���� Ʈ����: auth metadata���� �̸�/���� �켱���� �ݿ�
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  uname text;
  p1 text;
  p2 text;
  p3 text;
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

  p1 := nullif(trim(new.raw_user_meta_data->>'role_priority_1'), '');
  p2 := nullif(trim(new.raw_user_meta_data->>'role_priority_2'), '');
  p3 := nullif(trim(new.raw_user_meta_data->>'role_priority_3'), '');

  if p1 not in ('L', 'M', 'S', 'D', 'A/G', 'B/G', 'E/G', 'V', 'STAFF') then p1 := null; end if;
  if p2 not in ('L', 'M', 'S', 'D', 'A/G', 'B/G', 'E/G', 'V', 'STAFF') then p2 := null; end if;
  if p3 not in ('L', 'M', 'S', 'D', 'A/G', 'B/G', 'E/G', 'V', 'STAFF') then p3 := null; end if;

  insert into public.profiles (id, username, role, role_priority_1, role_priority_2, role_priority_3)
  values (new.id, left(trim(uname), 80), 'member', coalesce(p1, 'STAFF'), p2, p3)
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) setlist ���ξ� ���� ���̺�
-- ---------------------------------------------------------------------------
create table if not exists public.setlist_lineups (
  id uuid primary key default gen_random_uuid(),
  setlist_id uuid not null references public.setlists(id) on delete cascade,
  role_code text not null check (role_code in ('L', 'M', 'S', 'D', 'A/G', 'B/G', 'E/G', 'V', 'STAFF')),
  member_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (setlist_id, role_code)
);

create index if not exists setlist_lineups_setlist_idx on public.setlist_lineups (setlist_id);
create index if not exists setlist_lineups_member_idx on public.setlist_lineups (member_id);

drop trigger if exists trg_setlist_lineups_updated_at on public.setlist_lineups;
create trigger trg_setlist_lineups_updated_at
  before update on public.setlist_lineups
  for each row
  execute function public.set_updated_at();

alter table public.setlist_lineups enable row level security;

drop policy if exists "setlist_lineups_select_authenticated" on public.setlist_lineups;
create policy "setlist_lineups_select_authenticated"
  on public.setlist_lineups
  for select
  to authenticated
  using (true);

drop policy if exists "setlist_lineups_insert_leader" on public.setlist_lineups;
create policy "setlist_lineups_insert_leader"
  on public.setlist_lineups
  for insert
  to authenticated
  with check (public.is_leader(auth.uid()));

drop policy if exists "setlist_lineups_update_leader" on public.setlist_lineups;
create policy "setlist_lineups_update_leader"
  on public.setlist_lineups
  for update
  to authenticated
  using (public.is_leader(auth.uid()))
  with check (public.is_leader(auth.uid()));

drop policy if exists "setlist_lineups_delete_leader" on public.setlist_lineups;
create policy "setlist_lineups_delete_leader"
  on public.setlist_lineups
  for delete
  to authenticated
  using (public.is_leader(auth.uid()));

comment on table public.setlist_lineups is '��Ƽ�� ������ ���ξ� ���� (Ahaba)';
comment on column public.setlist_lineups.role_code is 'L, M, S, D, A/G, B/G, E/G, V, STAFF';
