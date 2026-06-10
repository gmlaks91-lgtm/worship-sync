begin;

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null,
  week_end_date date not null,
  summary text not null,
  keywords text[] not null default '{}',
  stats jsonb not null default '{}'::jsonb,
  generated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_reports_week_start_key unique (week_start_date)
);

create index if not exists ai_reports_week_start_idx
  on public.ai_reports (week_start_date desc);

drop trigger if exists ai_reports_set_updated_at on public.ai_reports;
create trigger ai_reports_set_updated_at
  before update on public.ai_reports
  for each row
  execute function public.set_updated_at();

alter table public.ai_reports enable row level security;

drop policy if exists "ai_reports_authenticated_select" on public.ai_reports;
create policy "ai_reports_authenticated_select"
  on public.ai_reports
  for select
  to authenticated
  using (true);

drop policy if exists "ai_reports_leader_insert" on public.ai_reports;
create policy "ai_reports_leader_insert"
  on public.ai_reports
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('leader', 'admin')
    )
  );

drop policy if exists "ai_reports_leader_update" on public.ai_reports;
create policy "ai_reports_leader_update"
  on public.ai_reports
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

commit;
