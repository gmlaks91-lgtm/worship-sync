-- Ahaba update: recurring schedule deletion tombstones

create table if not exists public.recurring_schedule_exclusions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  kind text not null check (kind in ('practice', 'worship', 'social')),
  starts_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (title, kind, starts_at)
);

alter table public.recurring_schedule_exclusions enable row level security;

drop policy if exists "leader can manage recurring exclusions" on public.recurring_schedule_exclusions;
create policy "leader can manage recurring exclusions"
  on public.recurring_schedule_exclusions
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'leader'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'leader'
    )
  );
